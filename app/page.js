'use client'
import Image from "next/image";
import { useState, useEffect } from 'react';
import { firestore } from "@/firebase";
import { Container, Box, Modal, Typography, Stack, TextField, Button, CircularProgress } from '@mui/material'
import { collection, deleteDoc, doc, setDoc, getDocs, query, getDoc } from "firebase/firestore";

export default function Home() {
  const [ inventory, setInventory ] = useState([]);
  const [ open, setOpen ] = useState(false);
  const [ itemName, setItemName ] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentItem, setCurrentItem] = useState(null); // Store the item being edited
  const [itemCount, setItemCount] = useState(''); 


  const updateInventory = async() => {
    //setLoading(true);
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
    //setLoading(false);
  }

  const editItem = async (item, newCount) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    //const docSnap = await getDoc(docRef);
    await setDoc(docRef, {quantity:newCount});
    await updateInventory();
  }

  const addItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()){
      const {quantity} = docSnap.data();
      await setDoc(docRef, {quantity: quantity+1});
      
    }
    else{
      await setDoc(docRef, {quantity:1});
    }
    await updateInventory();
  }

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()){
      const {quantity} = docSnap.data();
      if (quantity === 1){
        await deleteDoc(docRef);
      }
      else {
        await setDoc(docRef, {quantity: quantity-1});
      }
    }
    await updateInventory();
  }


  const fetchData = async (searchTerm) => {
    setLoading(true); // Start loading indicator
  
    // Use Firestore to get the inventory data
    const snapshot = await getDocs(collection(firestore, 'inventory'));
    const filteredList = [];
  
    snapshot.forEach((doc) => {
      const data = {
        name: doc.id,
        ...doc.data(),
      };
      if (data.name && data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        filteredList.push(data); // Add matching data to the filtered list
      }
    });
  
    setLoading(false); // Stop loading indicator
    console.log('fetched data', filteredList);
    return filteredList; // Return the filtered list
  };
  

  

  const handleSearchChange = async (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    console.log('query', query);

    if (query.length > 0 ) {
      const results = await fetchData(query);
      setFilteredInventory(results);
    } else {
      setFilteredInventory(inventory);
    }
    setLoading(false);

  }

  useEffect(() => {
    updateInventory();
  }, [])

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
  }

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
            transform:'translate(-50%,-50%)',
          }}
        >
          <Typography variant="h6">{modalMode === 'add' ? 'Add Item' : 'Edit Item'}</Typography>
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
          onClick={()=>{
            handleOpen()
          }}
        >
          Add New
        </Button>
      </Box>
      
      
      <Box
        border='1px solid #333'
      >
        <Box
          width="800px"
          height="100px"
          bgcolor="#ADD8E6"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            variant="h2"
            color="#333"
          >
            Inventory Items
          </Typography>
        </Box>

      
      {loading ? (
        <CircularProgress sx={{mt:2}} />
      ) : (
      
      <Stack width="800px" height="300px" spacing={2} overflow="auto">
        {
          filteredInventory.map(({name, quantity})=>(
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
              <Typography 
                variant="h3" 
                color="#333" 
                textAlign="center" 
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Typography>
              <Typography 
                variant="h3" 
                color="#333" 
                textAlign="center" 
              >
                {quantity}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={()=> {
                  addItem(name)
                }}>
                  Add
                </Button>
                <Button variant="contained" onClick={()=> {
                  handleOpen('edit', { name }, quantity);
                }}>
                  Edit
                </Button>
                <Button variant="contained" onClick={()=> {
                  removeItem(name)
                }}>
                  Remove
                </Button>
              </Stack>
              

            </Box>
          ))
        }
      </Stack>

      )}

    </Box>
    </Box>
  );
}
