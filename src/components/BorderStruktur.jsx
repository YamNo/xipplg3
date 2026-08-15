const BorderStruktur = (props) => {
	const Jabatan = props.Jabatan;
	const Nama = props.Nama;
	const Width = props.Width;

	return (
		<div className="flex flex-col justify-center items-center"> 
			<div className="text-white text-sm mb-1">{Jabatan}</div>
			<div
				className={`bg-white text-black rounded-full text-[0.8rem] px-4 py-1.5 text-center font-semibold whitespace-nowrap`}
				style={{ minWidth: Width }}>
				{Nama}
			</div>
		</div>
	)
}

export default BorderStruktur;
