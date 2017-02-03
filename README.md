

# Helpdesk-qms

A Utility that helps you to manage your helpdesk with smart queuing system

## Description:

Tired of waiting in the programming Helpdesk hoping someone would eventually help you out? Wait no more! Helpdesk++ is a Helpdesk ticketing system that enable students to queue up in the helpdesk online through their own web browser.

## Typical Usecase:

- Student arrives the programming helpdesk. Sees the QR code up on the projector, and its says scan to queue up. The projector also shows the list of students in the queue.

- Then the student scans the code, and this redirects to the web application. Here the student has to log in using their doubtfire credentials (for now, I’ll implement a local database with mock data

- Once logged in, the student can queue up. Before queuing they need to specify what unit they need help on, and who they need help from. Once queued, student’s name shows up in the queue, and also in the projector. The student is granted a ticket, and this ticket provides 10 mins of consultation time

- When the student’s ticket is on the top of the queue, a tutor will attend the student and his consultation ticket will expire after 5 mins. The student get to extend it just once for 2 more mins, but after that the student has to re-queue.

- In the teacher view, the teacher can manually edit the queue. This view can also be projected using a projector and be displayed in the helpdesk room
