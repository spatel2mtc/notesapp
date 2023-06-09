import './App.css';
import 'antd/dist/reset.css';
import React, {useEffect, useReducer } from 'react'
import { API } from 'aws-amplify'
import { listNotes } from './graphql/queries'
import {  createNote as CreateNote, 
          deleteNote as DeleteNote,
          updateNote as UpdateNote, } from './graphql/mutations'
import { onCreateNote } from './graphql/subscriptions'          
import { List, Input, Button } from 'antd'
import { v4 as uuid } from 'uuid'
import { format, formatDistance, formatRelative, subDays } from 'date-fns'

const CLIENT_ID = uuid()
const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: {
    name: '',
    description: ''
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTE':
  return { ...state, notes: [action.note, ...state.notes]}
case 'RESET_FORM':
  return { ...state, form: initialState.form }
case 'SET_INPUT':
  return { ...state, form: { ...state.form, [action.name]: action.value } }
case 'SET_NOTES':
      return {
        ...state, notes: action.notes, loading: false
      }
case 'ERROR':
        return {
          ...state, loading: false, error: true
        }
  default:
          return {
            ...state
          };
  }
};

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchNotes = async () => {
    try {
      const notesData = await API.graphql({
        query: listNotes
      })
      dispatch({
        type: 'SET_NOTES',
        notes: notesData.data.listNotes.items
      })
    } catch (err) {
      console.err(err);
      dispatch({
        type: 'ERROR'
      })
    }
  };

  useEffect(() => {
    fetchNotes()
    const subscription = API.graphql({
      query: onCreateNote
    })
      .subscribe({
        next: noteData => {
          const note = noteData.value.data.onCreateNote
          if (CLIENT_ID === note.clientId) return
          dispatch({ type: 'ADD_NOTE', note })
        }
      })
      return () => subscription.unsubscribe()
  }, []);

  const styles = {
    container: {padding: 20},
    input: {marginBottom: 10},
    item: { textAlign: 'left' },
    p: { color: '#1890ff' },

  }



  function renderItem(item) {
    return (
      <List.Item style={styles.item}
      actions={[
        <p style={{color: item.priority === "High" ? "#FF0000" :"#00FF00" }}
        >{item.priority}</p>,
        <p style={styles.p} onClick={() => deleteNote(item)}>Delete</p>,
        <p style={styles.p} onClick={() => updateNote(item)}>
      {item.completed ? 'completed' : 'mark completed'}
    </p>,
    <button 
    id="highPriority"
    onClick={() => setToHigh(item)}
    >!</button>,
    <button 
    id="lowPriority"
    onClick={() => setToLow(item)}
    >-</button>
      ]}
      >
        
        <List.Item.Meta
          title={item.name}
          description={item.description}

        />
      </List.Item>
        )
  }

  const createNote= async() => {
    const { form } = state
    if (!form.name || !form.description) {
       return alert('please enter a name and description')
    }
    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid(),priority: "Low" }
    dispatch({ type: 'ADD_NOTE', note })
    dispatch({ type: 'RESET_FORM' })
    try {
      await API.graphql({
        query: CreateNote,
        variables: { input: note }
      })
      console.log('successfully created note!')
    } catch (err) {
      console.error(err);
    }
  }

  const onChange = (e) => {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value })
  }

  const deleteNote = async({ id }) => {
    const index = state.notes.findIndex(n => n.id === id)
    const notes = [
      ...state.notes.slice(0, index),
      ...state.notes.slice(index + 1)];
    dispatch({ type: 'SET_NOTES', notes })
    try {
      await API.graphql({
        query: DeleteNote,
        variables: { input: { id } }
      })
      console.log('successfully deleted note!')
      } catch (err) {
        console.log({ err })
    }
  }

  const updateNote = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed
    dispatch({ type: 'SET_NOTES', notes})
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed } }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.log('error: ', err)
    }
  }

  const setToHigh = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].priority = "High"
    dispatch({ type: 'SET_NOTES', notes})
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, priority: notes[index].priority } }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.log('error: ', err)
    }
  }

  const setToLow = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].priority = "Low"
    dispatch({ type: 'SET_NOTES', notes})
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, priority: notes[index].priority } }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.log('error: ', err)
    }
  }


  var total = state.notes.length;
  console.log(total);
  console.log(state.notes);
  var completed = state.notes.filter(finished => finished.completed).length;
  console.log(completed);
  var high = state.notes.filter(notes => notes.priority == "High");
  var low = state.notes.filter(notes => notes.priority == "Low");
  
  



  return ( 


  
  <div style={styles.container}>
    <h2>Current List</h2>
    <h3>Total Items:{total}</h3>
    <h4>Unfinished Items: {total - completed}</h4>
    <h4># of High Priority Items: {high.length}</h4>
        <List
          loading={state.loading}
          dataSource={state.notes}
          renderItem={renderItem}
        />
        <hr></hr>
        <h3>Create New Item</h3>
      <Input
      onChange={onChange}
      value={state.form.name}
      placeholder="Note Name"
      name='name'
      style={styles.input}
    />
    <Input
      onChange={onChange}
      value={state.form.description}
      placeholder="Note description"
      name='description'
      style={styles.input}
    />
    <Button
      onClick={createNote}
      type="primary"
    >Create Note</Button>
    

        <hr></hr>

  </div>

  );
}

export default App;