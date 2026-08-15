import React, { useEffect, useState } from "react"
import Slider from "react-slick"
import "slick-carousel/slick/slick.css"
import "slick-carousel/slick/slick-theme.css"
import ButtonSend from "../components/ButtonSend"
import ButtonRequest from "../components/ButtonRequest"
import { db } from "../firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import Modal from "@mui/material/Modal"
import { Box, IconButton } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { useSpring, animated } from "@react-spring/web" // Import the necessary components

const Carousel = () => {
	const [images, setImages] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [open, setOpen] = useState(false)
	const [selectedImage, setSelectedImage] = useState(null)

	const modalFade = useSpring({
		opacity: open ? 1 : 0,
		config: { duration: 300 }, // Adjust the duration as needed
	})

	// Fungsi untuk mengambil daftar gambar dari Firebase Storage
	const fetchImagesFromFirebase = async () => {
		try {
			const imagesQuery = query(collection(db, "images"), orderBy("createdAt", "asc"))
			const snapshot = await getDocs(imagesQuery)
			const imageURLs = snapshot.docs
				.filter((doc) => doc.data().status === "approved")
				.map((doc) => doc.data().url)

			setImages(imageURLs)
		} catch (error) {
			console.error("Error fetching approved images from Firestore:", error)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchImagesFromFirebase()
	}, [])

	// Mobile: slidesToShow selalu 1, jadi carousel aman dipakai selama foto > 1.
	// accessibility: false mematikan pengaturan fokus bawaan slick yang memicu
	// warning "aria-hidden on an element because its descendant retained focus".
	const mobileSettings = {
		centerMode: true,
		centerPadding: "50px",
		slidesToShow: 1,
		slidesToScroll: 1,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 2000,
		dots: false,
		arrows: false,
		accessibility: false,
	}

	// Desktop: slidesToShow 3, carousel cuma aman dipakai kalau foto > 3
	// (react-slick berantakan saat slidesToShow >= jumlah slide asli).
	const desktopSettings = {
		centerMode: true,
		centerPadding: "30px",
		slidesToShow: 3,
		slidesToScroll: 1,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 2000,
		dots: true,
		accessibility: false,
	}

	const handleImageClick = (imageUrl) => {
		setSelectedImage(imageUrl)
		setOpen(true)
	}

	const handleCloseModal = () => {
		setOpen(false)
		setSelectedImage(null)
	}

	return (
		<>
			<div className="text-white opacity-60 text-base font-semibold mb-4 mx-[10%] mt-10 lg:text-center lg:text-3xl lg:mb-8" id="Gallery">
				Class Gallery
			</div>
			<div id="Carousel">
				{isLoading ? (
					<div className="flex flex-wrap justify-center gap-6 px-[10%]">
						<div className="Skeleton h-[300px] w-[300px]"></div>
						<div className="Skeleton h-[300px] w-[300px] hidden lg:block"></div>
						<div className="Skeleton h-[300px] w-[300px] hidden lg:block"></div>
					</div>
				) : images.length === 0 ? null : (
					<>
						{/* Mobile */}
						<div className="lg:hidden">
							{images.length === 1 ? (
								<div className="flex justify-center">
									<img
										src={images[0]}
										alt="Image 0"
										onClick={() => handleImageClick(images[0])}
										style={{ cursor: "pointer" }}
									/>
								</div>
							) : (
								<Slider {...mobileSettings}>
									{images.map((imageUrl, index) => (
										// Div luar dipakai slick (dipaksa display:inline-block),
										// jadi centering harus di div dalam supaya tidak ditimpa.
										<div key={index}>
											<div className="flex justify-center">
												<img
													src={imageUrl}
													alt={`Image ${index}`}
													onClick={() => handleImageClick(imageUrl)}
													style={{ cursor: "pointer" }}
												/>
											</div>
										</div>
									))}
								</Slider>
							)}
						</div>

						{/* Desktop */}
						<div className="hidden lg:block">
							{images.length <= 3 ? (
								<div className="flex flex-wrap justify-center gap-6 px-[10%]">
									{images.map((imageUrl, index) => (
										<img
											key={index}
											src={imageUrl}
											alt={`Image ${index}`}
											onClick={() => handleImageClick(imageUrl)}
											style={{ cursor: "pointer" }}
										/>
									))}
								</div>
							) : (
								<Slider {...desktopSettings}>
									{images.map((imageUrl, index) => (
										<div key={index}>
											<div className="flex justify-center">
												<img
													src={imageUrl}
													alt={`Image ${index}`}
													onClick={() => handleImageClick(imageUrl)}
													style={{ cursor: "pointer" }}
												/>
											</div>
										</div>
									))}
								</Slider>
							)}
						</div>
					</>
				)}
			</div>

			<div className="flex justify-center items-center gap-6 text-base mt-5 lg:mt-8">
				<ButtonSend />
				<ButtonRequest />
			</div>

			<Modal
				open={open}
				onClose={handleCloseModal}
				aria-labelledby="image-modal"
				aria-describedby="image-modal-description"
				className="flex justify-center items-center">
				<animated.div
					style={{
						...modalFade,
						maxWidth: "90vw",
						maxHeight: "auto",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						position: "relative",
					}}
					className="p-2 rounded-lg">
					<IconButton
						edge="end"
						color="inherit"
						onClick={handleCloseModal}
						aria-label="close"
						sx={{
							position: "absolute",
							top: "12px",
							right: "23px",
							backgroundColor: "white",
							borderRadius: "50%",
						}}>
						<CloseIcon />
					</IconButton>
					<div className="w-full">
						<img
							src={selectedImage}
							alt="Selected Image"
							style={{ maxWidth: "100%", maxHeight: "100vh" }}
						/>
					</div>
				</animated.div>
			</Modal>
		</>
	)
}

export default Carousel
