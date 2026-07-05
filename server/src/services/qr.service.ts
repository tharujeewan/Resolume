import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

class QrService {
  /**
   * Generate QR Code as PNG Buffer
   */
  async generatePNG(url: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(url, {
        type: 'png',
        margin: 2,
        width: 1024,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff', // White
        },
      });
      return buffer;
    } catch (error: any) {
      logger.error(`Error generating QR PNG: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate QR Code as SVG String
   */
  async generateSVG(url: string): Promise<string> {
    try {
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      return svgString;
    } catch (error: any) {
      logger.error(`Error generating QR SVG: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a print-ready event QR Code flyer PDF.
   * Renders a premium card template with custom typography.
   */
  async generatePDF(url: string, eventName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Draw elegant gradient-like background borders
        doc.rect(20, 20, 555, 802)
          .lineWidth(1)
          .stroke('#e2e8f0');

        // Draw an inner decorative box
        doc.rect(30, 30, 535, 782)
          .lineWidth(2)
          .stroke('#0f172a');

        // Header Title
        doc.fillColor('#0f172a')
          .fontSize(36)
          .font('Helvetica-Bold')
          .text('SHARE YOUR PHOTOS!', 0, 100, { align: 'center' });

        // Event Name
        doc.fillColor('#4f46e5') // Indigo 600
          .fontSize(22)
          .font('Helvetica-Bold')
          .text(eventName.toUpperCase(), 0, 160, { align: 'center' });

        // Subtitle instructions
        doc.fillColor('#475569') // Slate 600
          .fontSize(14)
          .font('Helvetica')
          .text('Scan the QR code below to upload photos from your phone directly to the live event screen!', 80, 210, {
            align: 'center',
            width: 435,
            lineGap: 4,
          });

        // Generate QR code data URL for embedding in PDF
        QRCode.toDataURL(url, {
          margin: 1,
          width: 320,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }, (err, dataUrl) => {
          if (err) {
            reject(err);
            return;
          }

          // Embed QR Code Image
          doc.image(dataUrl, 137, 280, { width: 320 });

          // Call to action
          doc.fillColor('#0f172a')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('NO APPS TO INSTALL', 0, 640, { align: 'center' });

          doc.fillColor('#64748b')
            .fontSize(12)
            .font('Helvetica')
            .text('Just scan, select your photos, and upload.', 0, 670, { align: 'center' });

          // Brand footer
          doc.fillColor('#94a3b8')
            .fontSize(10)
            .text('Powered by EventWall', 0, 750, { align: 'center' });

          doc.end();
        });
      } catch (error: any) {
        logger.error(`Error generating QR PDF: ${error.message}`);
        reject(error);
      }
    });
  }
}

export const qrService = new QrService();
export default qrService;
