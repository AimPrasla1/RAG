'use client'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('')
  const sendMessage = async () => {
    
    setMessages((messages) => [
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''},
    ])
    setMessage('')
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}]),
    }).then(async (res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
  
      return reader.read().then(function processText({done, value}) {
        if (done) {
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            {...lastMessage, content: lastMessage.content + text},
          ]
        })
        return reader.read().then(processText)
      })
    })
  }

  return (
    <Box width="100vw" height="100vh" bgcolor="#D3D9D4" display="flex" flexDirection="column">
      {/* Header */}
      <Box width="100vw" bgcolor="#212A31" p={2}>
        <Typography variant="h4" color="white" align="Center">
          RateWizard
        </Typography>
      </Box>

      <Box
        width="100vw"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <Stack
          direction={'column'}
          width="500px"
          height="700px"
          borderRadius={7}
          bgcolor="#2E3944"
          p={2}
          spacing={3}
        >
          <Stack
            direction={'column'}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
              >
                <Box
                  bgcolor={
                    message.role === 'assistant' ? '#124E66' : '#748D92'
                  }
                  color="white"
                  borderRadius={7}
                  p={3}
                >
                  {message.content}
                </Box>
              </Box>
            ))}
          </Stack>
          <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            InputProps={{
              style: {
                backgroundColor: '#748D92',
                color: 'white',
                borderRadius: 14,
                outline: 'none', 
                border: 'none', 
              },
            }}
            InputLabelProps={{
              style: {
                color: 'white',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'transparent', 
                },
                '&:hover fieldset': {
                  borderColor: 'transparent', 
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'transparent',
                },
              },
            }}
          />
            <Button
              variant="contained"
              onClick={sendMessage}
              sx={{
                bgcolor: '#124E66',
                color: 'white',
                borderRadius: 4,
                '&:hover': {
                  bgcolor: '#0A354D',
                },
              }}
            >
              Send
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}