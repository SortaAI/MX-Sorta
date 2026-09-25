"""Generate the one-page administrative checklist. Requires reportlab."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
OUT=Path(__file__).resolve().parents[1]/'assets/downloads/checklist-recepcion-clinica.pdf'
c=canvas.Canvas(str(OUT),pagesize=(612,792));c.setTitle('Checklist de recepción para clínicas | Sorta');c.setAuthor('Equipo de Sorta')
c.setFillColor(HexColor('#000054'));c.setFont('Helvetica-Bold',20);c.drawString(36,750,'Checklist de recepción para clínicas')
c.setFont('Helvetica',10);c.drawString(36,730,'Antes, durante y después de la consulta · Versión 25/09/2026')
c.drawString(36,706,'Clínica: _______________________  Fecha: __________  Turno: __________')
c.setFont('Helvetica',9);c.drawString(36,686,'Estado: pendiente / en proceso / hecho. Asigna a una persona por tarea.')
rows=[('ANTES DE ABRIR',''),('Revisar solicitudes y citas confirmadas',''),('Comprobar cambios de horario y lugar',''),('Asignar mensajes y datos pendientes',''),('AL LLEGAR Y PREPARAR DOCUMENTOS',''),('Verificar cita e identificación del paciente',''),('Actualizar datos y avisar de la llegada',''),('Elegir formatos vigentes de la visita',''),('Dejar revisión clínica y firmas al responsable',''),('AL ENTREGAR EL TURNO',''),('Reflejar cambios y cancelaciones en agenda',''),('Entregar pendientes con siguiente acción',''),('Resguardar información y cerrar sesiones','')]
y=662;c.setFillColor(HexColor('#2740fc'));c.rect(36,y-25,540,25,fill=1,stroke=0);c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',10)
for x,t in [(45,'Tarea'),(360,'Responsable'),(479,'Estado')]:c.drawString(x,y-17,t)
y-=25
for task,_ in rows:
 section=task.isupper();height=27 if section else 31
 if section:c.setFillColor(HexColor('#e8ecff'));c.rect(36,y-height,540,height,fill=1,stroke=0)
 c.setStrokeColor(HexColor('#dfe5f0'));c.line(36,y-height,576,y-height);c.setFillColor(HexColor('#000054'));c.setFont('Helvetica-Bold' if section else 'Helvetica',9);c.drawString(45,y-18,task)
 if not section:
  c.line(355,y,355,y-height);c.line(474,y,474,y-height)
 y-=height
c.setFont('Helvetica',10);c.drawString(36,y-25,'Siguiente acción / referencia interna: __________________________________________')
c.drawString(36,y-47,'________________________________________________________________________')
c.setFont('Helvetica',9)
for i,t in enumerate(['Guía administrativa; adapta las tareas a tu clínica. No sustituye protocolos clínicos.', 'No anotes diagnósticos ni datos sensibles innecesarios en esta lista.', 'Las decisiones clínicas, autorizaciones y firmas corresponden a sus responsables.']):c.drawString(36,y-78-i*14,t)
c.setFillColor(HexColor('#2740fc'));c.drawString(36,36,'mx.getsorta.io/recursos/checklist-recepcion-clinica');c.save();print(OUT)
