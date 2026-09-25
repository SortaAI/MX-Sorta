"""Build the original printable software evaluation sheet; requires reportlab."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
out=Path(__file__).resolve().parents[1]/'assets/downloads/evaluar-software-clinica.pdf'
c=canvas.Canvas(str(out),pagesize=(612,792));c.setTitle('Evaluar software para una clínica | Sorta');c.setAuthor('Equipo de Sorta')
c.setFillColor(HexColor('#000054'));c.setFont('Helvetica-Bold',19);c.drawString(35,753,'Evaluar software para una clínica')
c.setFont('Helvetica',10)
for y,t in [(729,'Proveedor / plan: __________________________  Fecha: __________________'),(708,'Equipo que prueba: ___________________________________________________'),(687,'Indispensables: ______________________________________________________'),(665,'Estado: demostrado / por configurar / no disponible / sin comprobar.')]:c.drawString(35,y,t)
c.setFillColor(HexColor('#2740fc'));c.rect(35,623,542,25,fill=1,stroke=0);c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',10)
for x,t in [(44,'Criterio'),(254,'Estado'),(377,'Evidencia / pendiente')]:c.drawString(x,631,t)
rows=['Solicitud y cita confirmada','Cambio o cancelación de horario','Captura y datos que se repiten','Configuración de formatos propios','Revisión y responsabilidades','Entrega de pendientes entre turnos','Accesos y exportación de datos','Herramientas que se conservan','Costo total, soporte y cancelación']
y=623
for t in rows:
 c.setFillColor(HexColor('#000054'));c.setFont('Helvetica',10);c.drawString(44,y-23,t);c.setStrokeColor(HexColor('#dfe5f0'));c.rect(35,y-43,542,43,stroke=1,fill=0)
 for x in [247,370]:c.line(x,y,x,y-43)
 y-=43
c.setFont('Helvetica',10)
for yy,t in [(211,'Pendiente indispensable: _________________________________________________'),(184,'Responsable de responder / fecha: _________________________________________'),(157,'Resultado que debe demostrar el piloto: ____________________________________'),(130,'____________________________________________________________________')]:c.drawString(35,yy,t)
c.setFont('Helvetica',9);c.drawString(35,87,'Usa datos ficticios. Registra lo que viste; una promesa no es una función demostrada.')
c.drawString(35,72,'Una hoja por proveedor. Compara primero los requisitos indispensables de tu clínica.')
c.setFillColor(HexColor('#2740fc'));c.drawString(35,35,'mx.getsorta.io/recursos/elegir-software-clinica');c.save();print(out)
