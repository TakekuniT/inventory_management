"use client";

import React, { useState, useRef, useEffect } from 'react';
import { firestore } from "@/firebase";
import { Container, Box, Modal, Typography, Stack, TextField, Button, CircularProgress } from '@mui/material'
import { collection, deleteDoc, doc, setDoc, getDocs, query, getDoc } from "firebase/firestore";
import { Camera } from "react-camera-pro";
import { identifyObjectFromCamera, getChatResponse } from './openai_func';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentItem, setCurrentItem] = useState(null); // Store the item being edited
  const [itemCount, setItemCount] = useState(''); 
  const [showCamera, setShowCamera] = useState(false); // New state to control camera visibility
  const [image, setImage] = useState(null); // New state to store the image
  const [identifiedObject, setIdentifiedObject] = useState(''); // State to store identified object
  const [identificationLoading, setIdentificationLoading] = useState(false); // Loading state for identification process


  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);
    setFilteredInventory(inventoryList);
  };

  const editItem = async (item, newCount) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    await setDoc(docRef, { quantity: newCount });
    await updateInventory();
  };

  const addItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: 1 });
    }
    await updateInventory();
  };

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updateInventory();
  };

  const fetchData = async (searchTerm) => {
    setLoading(true); // Start loading indicator

    const snapshot = await getDocs(collection(firestore, 'inventory'));
    const filteredList = [];

    snapshot.forEach((doc) => {
      const data = {
        name: doc.id,
        ...doc.data(),
      };
      if (data.name && data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        filteredList.push(data);
      }
    });

    setLoading(false); // Stop loading indicator
    return filteredList; // Return the filtered list
  };

  const handleSearchChange = async (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.length > 0) {
      const results = await fetchData(query);
      setFilteredInventory(results);
    } else {
      setFilteredInventory(inventory);
    }
    setLoading(false);
  };


  const CameraComponent = () => {
    const camera = useRef(null);

    const takePhoto = async () => {
      const img = camera.current.takePhoto();
      setImage(img); // Save the image taken
      setShowCamera(false); // Hide camera after photo

      // Call the identifyObjectFromCamera function with the captured image
      try {
        setIdentificationLoading(true); // Start identification loading indicator
        const identifiedObj = await identifyObjectFromCamera(img); // Pass the image to the function
        setIdentifiedObject(identifiedObj); // Save the identified object
        setIdentificationLoading(false); // Stop identification loading indicator

        // Optionally, automatically add the identified object to the inventory
        if (identifiedObj) {
          await addItem(identifiedObj);
          alert(`Identified and added: ${identifiedObj}`); // Show alert with the identified object
        } else {
          alert('Unable to identify the object. Please try again.');
        }
      } catch (error) {
        console.error('Error identifying object:', error);
        alert('Failed to identify the object.');
        setIdentificationLoading(false);
      }
    };

    return (
      <Box
        position="fixed"
        top="0"
        left="0"
        width="100vw"
        height="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="rgba(0,0,0,0.8)"
        zIndex="1300" // Ensure camera overlay appears on top
      >
        <Camera ref={camera} />
        <Button
          variant="contained"
          color="primary"
          onClick={takePhoto}
        >
          Take photo
        </Button>
      </Box>
    );
  };


  useEffect(() => {
    if (typeof window !== "undefined") {
      updateInventory();
    }
  }, []);

  const handleOpen = (mode, item = null, count = 0) => {
    setModalMode(mode);
    setCurrentItem(item);
    setItemName(item?.name || ''); // Pre-fill the item name when editing
    setItemCount(count || ''); // Pre-fill the item count when editing
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setItemName('');
    setItemCount('');
    setCurrentItem(null);
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap={2}
    >
      {showCamera && <CameraComponent />}
      <Modal open={open} onClose={handleClose}>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width={400}
          bgcolor="white"
          border="2px solid #000"
          boxShadow={24}
          p={4}
          display="flex"
          flexDirection="column"
          gap={3}
          sx={{
            transform: 'translate(-50%,-50%)',
          }}
        >
          <Typography variant="h6">
            {modalMode === 'add' ? 'Add Item' : 'Edit Item'}
          </Typography>
          <Stack width="100%" direction="row" spacing={2}>
            <TextField
              variant="outlined"
              fullWidth
              label="Item Name"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
              }}
              disabled={modalMode === 'edit'} // Disable editing of item name
            />
            <TextField
              variant="outlined"
              fullWidth
              label="Quantity"
              type="number"
              value={itemCount}
              onChange={(e) => {
                setItemCount(e.target.value);
              }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                if (modalMode === 'add') {
                  addItem(itemName);
                } else {
                  editItem(itemName, Number(itemCount)); // Pass the item name and new count
                }
                setItemName('');
                setItemCount('');
                handleClose();
              }}
            >
              {modalMode === 'add' ? 'Add' : 'Save'}
            </Button>
          </Stack>
        </Box>
      </Modal>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="start"
        spacing={5}
        gap={5}
      >
        <TextField
          variant="outlined"
          fullWidth
          label="Search Inventory"
          value={searchQuery}
          onChange={handleSearchChange} // Update search results in real-time
        />

        <Button
          variant="contained"
          onClick={() => {
            handleOpen();
          }}
        >
          Add New
        </Button>
        {/*
        <Button 
          variant="contained"
          onClick={() => {
            setShowCamera(true);
          }}
        >
          Scan Item
        </Button> 
        */}
      </Box>

      <Box border="1px solid #333">
        <Box
          width="800px"
          height="100px"
          bgcolor="#ADD8E6"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="h2" color="#333">
            Inventory Items
          </Typography>
        </Box>

        {loading ? (
          <CircularProgress sx={{ mt: 2 }} />
        ) : (
          <Stack width="800px" height="300px" spacing={2} overflow="auto">
            {filteredInventory.map(({ name, quantity }) => (
              <Box
                key={name}
                width="100%"
                minHeight="150px"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                bgColor="#f0f0f0"
                padding={5}
              >
                <Typography variant="h3" color="#333" textAlign="center">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography variant="h3" color="#333" textAlign="center">
                  {quantity}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      addItem(name);
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      handleOpen('edit', { name }, quantity);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      removeItem(name);
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
