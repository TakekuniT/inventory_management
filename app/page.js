"use client";

import React, { useState, useRef, useEffect } from 'react';
import { firestore } from "@/firebase";
import { Container, Box, Modal, Typography, Stack, TextField, Button, CircularProgress } from '@mui/material';
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

  const [aiMessage, setAiMessage] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

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
      <Box className="camera-overlay">
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

  const fetchItemNamesWithQuantities = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, 'inventory'));
  
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: doc.id,
          quantity: data.quantity,
        };
      });
  
      let resultString = items.map(item => `${item.name}: ${item.quantity}`).join(', ');
      resultString = 'Suggest me a recipe with the following ingredients: ' + resultString;
      const ai_msg = await getChatResponse(resultString);
      
      setAiMessage(ai_msg);
      setShowAiModal(true);
      
      return resultString;
    } catch (error) {
      console.error('Error fetching item names with quantities:', error);
      return 'Error fetching item data.';
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      updateInventory();
    }
  }, []);

  const handleOpen = (mode, item = null, count = 0) => {
    setModalMode(mode);
    setCurrentItem(item);
    setItemName(item?.name || ''); 
    setItemCount(count || ''); 
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setItemName('');
    setItemCount('');
    setCurrentItem(null);
  };

  return (
    <Container maxWidth="lg" className="home-container">
      <Typography variant="h1">
        StockKeeper
      </Typography>
      {showCamera && <CameraComponent />}
      <Modal open={showAiModal} onClose={() => setShowAiModal(false)}>
        <Box className="modal-box">
          <Typography variant="h6">
            AI Response
          </Typography>
          <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
            {aiMessage}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setShowAiModal(false)}
          >
            Close
          </Button>
        </Box>
      </Modal>
      <Modal open={open} onClose={handleClose}>
        <Box className="modal-box">
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
              disabled={modalMode === 'edit'} 
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
                  editItem(itemName, Number(itemCount));
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
      <Box className="controls"  gap={3}>
        <TextField
          variant="outlined"
          fullWidth
          label="Search Inventory"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <Button
          variant="contained"
          onClick={() => {
            handleOpen();
          }}
        >
          Add New
        </Button>
        
        <Button
          variant="contained"
          onClick={() => {
            fetchItemNamesWithQuantities();
          }}
        >
          Get Recipe
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
      <Box className="inventory-section">
        <Box className="inventory-header">
          <Typography variant="h2">
            Inventory Items
          </Typography>
        </Box>
        {loading ? (
          <CircularProgress className="loading-spinner" />
        ) : (
          <Stack className="inventory-list">
            {filteredInventory.map(({ name, quantity }) => (
              <Box
                key={name}
                className="inventory-item"
              >
                <Typography variant="h3" className="item-name">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography variant="h3" className="item-quantity">
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
    </Container>
  );
}
