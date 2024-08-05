require('dotenv').config();
const fs = require('fs');
const archiver = require('archiver');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');
const SVGtoPDF = require('svg-to-pdfkit');

const marginLeft = Number(process.env.marginLeft);
const marginTop = Number(process.env.marginTop);
const small_label_size = Number(process.env.small_label_size);
const large_label_size = Number(process.env.large_label_size);
const pageWidth = Number(process.env.pageWidth);
const pageHeight = Number(process.env.pageHeight);
const gap_between_label = Number(process.env.gap_between_label);
const gap_between_row = Number(process.env.gap_between_row);
const stores = process.env.stores;
const product = process.env.product;
const trace = process.env.trace;
const svg = process.env.svg;
const discount = process.env.discount;
const smallLabel = Number(process.env.smallLabel);
const largeLabel = Number(process.env.largeLabel);
let archive = archiver('zip', { zlib: { level: 9 } });

function findImageFilename(
	directory,
	filenameWithoutExtension,
	labelSuffix = ''
) {
	let possibleExtensions = ['.jpg', '.png'];

	for (let extension of possibleExtensions) {
		let possibleFilename =
			directory + filenameWithoutExtension + labelSuffix + extension;
		if (fs.existsSync(possibleFilename)) {
			return possibleFilename;
		}
	}

	return null;
}

let countPdf = 1;
let countSvg = 1;

async function generatePDF(data, desiredLabelSize, doc, cdrDoc) {
	let totalQuantity = 0;
	let labelQuantity = 0;
	const currentDate = new Date();
	const year = currentDate.getFullYear().toString();
	const day = currentDate.getDate().toString().padStart(2, '0');
	const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
	const hours = currentDate.getHours().toString().padStart(2, '0');
	const minutes = currentDate.getMinutes().toString().padStart(2, '0');
	const seconds = currentDate.getSeconds().toString().padStart(2, '0');
	const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
	// const fileName = `one_kirana_${formattedDate}_${desiredLabelSize}_${countPdf++}.pdf`;
	const fileName = `products_lable`;
	// const cdrName = `svg_trace_${desiredLabelSize}_${countSvg++}.pdf`;
	const cdrName = `svg_trace`;
	const labelSize = desiredLabelSize;

	async function addLargeLabel(x, y, data) {
		let filenameParts = data.Store_logo_file_name.split('.');
		let filenameWithoutExtension = filenameParts[0];
		let newFilename = findImageFilename(
			stores + data.Store_Code + '/',
			filenameWithoutExtension,
			'_' + largeLabel
		);
		let svgFilepath =
			stores +
			data.Store_Code +
			trace +
			filenameWithoutExtension +
			'_' +
			largeLabel +
			svg;
		const svgContent = fs.readFileSync(svgFilepath, 'utf-8');
		doc.image(newFilename, x, y, {
			fit: [large_label_size, large_label_size],
		});
		SVGtoPDF(cdrDoc, svgContent, x, y, {
			fit: [large_label_size, large_label_size],
		});
		let productnameParts = data.Product_image_file_name.split('.');
		let productnameWithoutExtension = productnameParts[0];
		let newProductname = findImageFilename(
			product + data.Product_Code + '/',
			productnameWithoutExtension,
			'_' + largeLabel
		);
		doc.image(newProductname, x, y, {
			fit: [large_label_size, large_label_size],
		});
		// if (data.Discount_variable_file_name) {
		//     doc.image(
		//         discount + data.Discount_variable_file_name,
		//         x + 1,
		//         y + 1,
		//         {
		//             fit: [50, 50],
		//         }
		//     );
		// }
	}

	async function addSmallLabel(x, y, data) {
		let filenameParts = data.Store_logo_file_name.split('.');
		let filenameWithoutExtension = filenameParts[0];
		let newFilename = findImageFilename(
			stores + data.Store_Code + '/',
			filenameWithoutExtension,
			'_' + smallLabel
		);

		let svgFilepath =
			stores +
			data.Store_Code +
			trace +
			filenameWithoutExtension +
			'_' +
			smallLabel +
			svg;

		const svgContent = fs.readFileSync(svgFilepath, 'utf-8');

		doc.image(newFilename, x, y, {
			fit: [small_label_size, small_label_size],
		});

		SVGtoPDF(cdrDoc, svgContent, x, y, {
			fit: [large_label_size, large_label_size],
		});

		let productnameParts = data.Product_image_file_name.split('.');
		let productnameWithoutExtension = productnameParts[0];
		let newProductname = findImageFilename(
			product + data.Product_Code + '/',
			productnameWithoutExtension,
			'_' + smallLabel
		);

		doc.image(newProductname, x, y, {
			fit: [small_label_size, small_label_size],
		});
		// if (data.Discount_variable_file_name) {
		//     doc.image(
		//         discount + data.Discount_variable_file_name,
		//         x + 1,
		//         y + 1,
		//         {
		//             fit: [25, 25],
		//         }
		//     );
		// }
	}
	let x = marginLeft;
	let y = marginTop;
	function checkPageOverflow(labelSize, totalLabelQuantity, labelQuantity) {
		if (y + labelSize > pageHeight - marginTop) {
			if (totalLabelQuantity != labelQuantity) {
				doc.end();
				cdrDoc.end();
				archive.append(doc, {
					name: `${fileName}_${formattedDate}_${desiredLabelSize}_${countPdf++}.pdf`,
				});
				archive.append(cdrDoc, {
					name: `${cdrName}_${formattedDate}_${desiredLabelSize}_${countSvg++}.pdf`,
				});
				doc = new PDFDocument({ size: [pageWidth, pageHeight] });
				cdrDoc = new PDFDocument({ size: [pageWidth, pageHeight] });
			}
			x = marginLeft;
			y = marginTop;
			return true;
		}
		return false;
	}

	let isPageAdded = false;
	let itemNumber = data.length;

	const calculateWidth = (labelSizeInfo) => {
		return (
			(pageWidth -
				(parseInt(pageWidth / labelSizeInfo) * labelSizeInfo +
					[parseInt(pageWidth / labelSizeInfo) - 1] *
						gap_between_label)) /
			2
		);
	};

	async function addLabels(data, labelFunc, labelSizeInfo) {
		await data.map(async (item) => {
			totalQuantity += item.Quantity;
			for (let i = 0; i < item.Quantity; i++) {
				isPageAdded = checkPageOverflow(
					labelSizeInfo,
					totalQuantity,
					labelQuantity
				);
				if (x == marginLeft && labelSizeInfo == large_label_size) {
					x = calculateWidth(large_label_size);
				}

				if (x == marginLeft && labelSizeInfo == small_label_size) {
					x = calculateWidth(small_label_size);
				}
				labelFunc(x, y, item);
				labelQuantity++;
				x += labelSizeInfo + gap_between_label;
				if (x + labelSizeInfo > pageWidth - marginLeft) {
					x = marginLeft;
					y += labelSizeInfo + gap_between_row;
				}
			}
			itemNumber--;
			if (itemNumber == 0) {
				isPageAdded = checkPageOverflow(
					labelSizeInfo,
					totalQuantity,
					labelQuantity
				);
				while (!isPageAdded) {
					if (x == marginLeft && labelSizeInfo == large_label_size) {
						x = calculateWidth(large_label_size);
					}
					if (x == marginLeft && labelSizeInfo == small_label_size) {
						x = calculateWidth(small_label_size);
					}
					labelFunc(x, y, item);
					x += labelSizeInfo + gap_between_label;
					if (x + labelSizeInfo > pageWidth - marginLeft) {
						x = marginLeft;
						y += labelSizeInfo + gap_between_row;
					}
					isPageAdded = checkPageOverflow(
						labelSizeInfo,
						totalQuantity,
						labelQuantity
					);
				}
			}
		});
	}

	if (labelSize == smallLabel) {
		await addLabels(data, addSmallLabel, small_label_size);
	}

	if (labelSize == largeLabel) {
		await addLabels(data, addLargeLabel, large_label_size);
	}
	doc.end();
	cdrDoc.end();
	archive.append(doc, {
		name: `${fileName}_${formattedDate}_${desiredLabelSize}_${countPdf++}.pdf`,
	});
	archive.append(cdrDoc, {
		name: `${cdrName}_${formattedDate}_${desiredLabelSize}_${countSvg++}.pdf`,
	});
	let Name = {
		fileName,
		cdrName,
	};
	return Name;
}

const importExcel = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const workbook = xlsx.read(req.file.buffer);

		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const jsonData = xlsx.utils.sheet_to_json(sheet);
		const fourfilteredData = jsonData.filter(
			(item) => item.Size_of_label === largeLabel
		);
		const twofilteredData = jsonData.filter(
			(item) => item.Size_of_label === smallLabel
		);

		archive.pipe(res);
		res.contentType('application/zip');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=one_kirana_pdfs.zip'
		);

		const doc1 = new PDFDocument({ size: [pageWidth, pageHeight] });
		const doc2 = new PDFDocument({ size: [pageWidth, pageHeight] });
		countPdf = 1;
		countSvg = 1;
		const fourLabelName = await generatePDF(
			fourfilteredData,
			largeLabel,
			doc1,
			doc2
		);

		const doc3 = new PDFDocument({ size: [pageWidth, pageHeight] });
		const doc4 = new PDFDocument({ size: [pageWidth, pageHeight] });
		countPdf = 1;
		countSvg = 1;
		const twoLabelName = await generatePDF(
			twofilteredData,
			smallLabel,
			doc3,
			doc4
		);

		if (fourLabelName && twoLabelName) {
			archive.finalize();
		}
		archive = archiver('zip', { zlib: { level: 9 } });
	} catch (e) {
		res.status(500).send({
			status: 500,
			message: 'Something went wrong!',
			error: e,
		});
	}
};

module.exports = {
	importExcel,
};
