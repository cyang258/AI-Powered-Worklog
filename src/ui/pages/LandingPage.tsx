import { useEffect, useState } from 'react'
import './LandingPage.css'
import { Alert, Box, Grid, Heading, SkeletonText, Spinner, Image, Text, Stack, GridItem } from '@chakra-ui/react';
import { toaster } from '../components/toaster';

type User = {
  name: string;
  email: string;
  age: number;
}

function LandingPage({ isLoading, error, msg }: { isLoading: boolean; error: string; msg: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [imgReplyLoading, setImgReplyLoading] = useState<boolean>(false);
  const [imgReply, setImgReply] = useState<string>('');
  const [promptReplyLoading, setPromptReplyLoading] = useState<boolean>(false);
  const [promptReply, setPromptReply] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('Tell me a joke')
  
  useEffect(() => {
    if(error && error !== "") {
      toaster.create({
        description: "File saved successfully",
        duration: 6000,
      })
    }
  }, [error])
  useEffect(() => {
    setImgReplyLoading(true)
    setPromptReplyLoading(true)
    window.API.db.user.getAllUser().then((data: User[]) => {
      setUsers(data);
    })
    window.API.ollama.onChatReply((_, data) => {
	    // clear loading animation
	    setImgReplyLoading(false)
	
      if (!data.success) {
        if (data.content !== "The operation was aborted.") {
          // Don't display an error if the user stopped the request
          setImgReply("Error: " + data.content);
        }
        return;
      }
	
      if (data.content.message.content && data.content.message.content.length > 0) {
        setImgReply((prev) => prev += data.content.message.content) 
      }
	
      if (data.content.done) {
        console.log('done');
      }
    });
    window.API.ollama.onPromptReply((_, data) => {
	    // clear loading animation
	    setPromptReplyLoading(false)
      if (!data.success) {
        if (data.content !== "The operation was aborted.") {
          // Don't display an error if the user stopped the request
          setPromptReply("Error: " + data.content);
        }
        return;
      }
	
      if (data.content.response && data.content.response !== "") {
        setPromptReply((prev) => prev += data.content.response) 
      }
	
      if (data.content.done) {
        console.log('done');
      }
    });
  }, [])

  return isLoading ? (
    <>
      <Box w="100%">
        <Alert.Root
          borderStartWidth="3px"
          borderStartColor="colorPalette.600"
          title="Initializing AI Model"
          w="80vw"
          justifyContent="center"
          alignItems="center"
        >
          <Alert.Indicator>
            <Spinner size="sm" />
          </Alert.Indicator>
          <Alert.Title textAlign="center">{msg}</Alert.Title>
        </Alert.Root>

        <SkeletonText noOfLines={10} gap="1" mt="4" w="100%" />
      </Box>
    </>
  ) : (
    <Box p={8}>
      {/* Chat Container */}
      <Box maxW="6xl">
        <Heading size="3xl" textAlign="center">
          Get started building a private AI-powered desktop app
        </Heading>
        <Stack gap="2" align="flex-start" mt={10} mx="10vw">
          <Text>
            You can use a local and private model to integrate with your own app
          </Text>
          <Text mt={1}>
            The inference runs locally with a self-contained Ollama, and you can use any model.
          </Text>
          <Text mt={1}>
            This allows you to send prompts to various LLMs to augment what a desktop application can do.
          </Text>
        </Stack>
        <Heading textAlign="left" size="lg" my={5}>
          Examples:
        </Heading>
        <Text fontWeight="bold" mt={1}>
          1. Interact with local sqlit3 database
        </Text>
        <Grid templateColumns="repeat(3, 1fr)" gap={1} w="100%">
          {/* Header Row */}
          <GridItem fontWeight="bold" key="header-1">Name</GridItem>
          <GridItem fontWeight="bold" key="header-2">Email</GridItem>
          <GridItem fontWeight="bold" key="header-3">Age</GridItem>

          {/* User Rows */}
          {users.map((user, idx) => (
            <div key={`user-${idx}`}>
              <GridItem key={`${idx}-name`}>{user.name}</GridItem>
              <GridItem key={`${idx}-email`}>{user.email}</GridItem>
              <GridItem key={`${idx}-age`}>{user.age}</GridItem>
            </div>
          ))}
        </Grid>
        <Text fontWeight="bold" mt={5}>
          2. Interact with Ollama Model that accept images
        </Text>
        <Text fontWeight="bold" mt={5}>
          You have to use a model that accept images
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} alignItems="center">
          <GridItem>
            <Box p={4}>
              <Image
                src="/animal.jpg"
                alt="Animal photo"
                width="400px"
                borderRadius="md"
              />
            </Box>
          </GridItem>
          <GridItem>
            <Box p={4}>
              <Box wordBreak="break-word">
                <Text fontWeight="bold">
                  Prompt: "What is in the picture"
                </Text>
              </Box>

              <Box mt={10} wordBreak="break-word" textAlign="left">
                <Box display="flex" alignItems="center">
                  { imgReplyLoading && <Spinner size="sm" mr={2} />}
                  <Text>{imgReply === "" ? "Loading..." : imgReply}</Text>
                </Box>
              </Box>
            </Box>
          </GridItem>
        </Grid>
        <Text fontWeight="bold" mt={5}>
          3. Simple interact with Ollama Model
        </Text>
        {/* Prompt section */}
        <Grid
          templateColumns={{ base: "1fr", md: "1fr 2fr" }}
          gap={4}
          p={4}
          alignItems="center"
        >
          {/* Prompt */}
          <Box
            bg="blue.100"
            p={4}
            borderRadius="md"
            boxShadow="sm"
            textAlign="center"
          >
            <Text fontWeight="bold">Prompt</Text>
            <Text mt={2}>{prompt}</Text>
          </Box>

          {/* Answer */}
          <Box
            bg="green.100"
            p={4}
            borderRadius="md"
            boxShadow="sm"
            textAlign="center"
          >
            <Text fontWeight="bold">Answer</Text>
            <Text mt={2}>{promptReply}</Text>
          </Box>
        </Grid>
      </Box>
    </Box>
  )
}

export default LandingPage
