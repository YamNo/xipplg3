const CLOUD_NAME = "dcwz44ny"
const UPLOAD_PRESET = "WebKelasPPLG3_unsigned"

export const uploadToCloudinary = async (file) => {
	const formData = new FormData()
	formData.append("file", file)
	formData.append("upload_preset", UPLOAD_PRESET)

	const response = await fetch(
		`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
		{ method: "POST", body: formData },
	)

	if (!response.ok) {
		throw new Error("Gagal upload")
	}

	const data = await response.json()
	return data.secure_url
}
