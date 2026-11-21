The video **"What is a Backend, how do they work and why do we need them?"** is an introductory lesson in the **Backend from First Principles** playlist. It focuses on building an intuition for what a backend actually is rather than teaching a specific framework like NestJS or Express. ([YouTube](https://www.youtube.com/watch?v=6Ss4dJD9Kzg&utm_source=chatgpt.com "3. What is a Backend, how do they work and why do we need ..."))

Here are the main topics discussed:

1. **What is a Backend?**
    
    - Traditional definition of a backend.
        
    - A backend is essentially a computer (server) listening for requests on the internet.
        
    - It receives requests, processes them, and sends responses.
        
2. **Why Do We Need a Backend?**
    
    - Why a frontend alone isn't enough.
        
    - Managing user data.
        
    - Authentication.
        
    - Storing information permanently.
        
    - Coordinating communication between different users.
        
3. **The Backend's Main Responsibility**
    
    - Handling data:
        
        - Receiving data.
            
        - Processing data.
            
        - Storing data.
            
        - Returning data to clients.
            
4. **Request Lifecycle**
    
    - What happens after you enter a website URL:
        
        - Browser sends request.
            
        - DNS resolves the domain.
            
        - Request reaches the server.
            
        - Backend processes it.
            
        - Response returns to the browser.
            
5. **DNS (Domain Name System)**
    
    - Why we use domain names instead of IP addresses.
        
    - How DNS translates a domain into an IP address.
        
6. **Servers and Cloud Instances**
    
    - What a server really is.
        
    - Hosting applications on cloud services (such as virtual machines).
        
7. **Firewalls / Security Groups**
    
    - Requests don't immediately reach your application.
        
    - Firewalls decide which ports are allowed (e.g., 80 for HTTP, 443 for HTTPS).
        
8. **Reverse Proxy (Nginx)**
    
    - Why applications usually aren't exposed directly to the internet.
        
    - How Nginx receives requests and forwards them to your backend application.
        
9. **Backend Application**
    
    - The actual Node.js/NestJS/Java/etc. application.
        
    - Executes business logic.
        
    - Reads and writes data.
        
    - Returns the response.
        
10. **Why Frontend Cannot Replace Backend**
    

- Browser security restrictions.
    
- No direct database access.
    
- Limited file system access.
    
- CORS restrictions.
    
- Heavy computation is better handled on servers.
    

11. **Complete Request Flow**
    

- The end-to-end path of a request:
    

```
Browser
   ↓
DNS
   ↓
Internet
   ↓
Cloud Server
   ↓
Firewall
   ↓
Nginx (Reverse Proxy)
   ↓
Backend Application
   ↓
Database
   ↓
Response back to Browser
```

This is the central concept of the video. ([YouTube](https://www.youtube.com/watch?v=6Ss4dJD9Kzg&utm_source=chatgpt.com "3. What is a Backend, how do they work and why do we need ..."))

Since you're about to start a **NestJS internship**, this video is especially valuable because it explains the infrastructure around your application. NestJS is only one piece of the request flow—the backend application. Understanding everything that happens before a request reaches NestJS (DNS, firewalls, reverse proxies) and after it leaves (database and response) will make it much easier to understand deployment and backend architecture later on.