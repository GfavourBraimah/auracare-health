# AuraCare Health

AuraCare Health Systems is transitioning a brittle, on-premises monolithic healthcare application into an enterprise-grade, **HIPAA-compliant containerized microservices architecture**. This repository provisions a secure 2-Tier Virtual Private Cloud (VPC), establishes automated vulnerability scanning with Amazon Elastic Container Registry (ECR), and deploys serverless microservices using AWS ECS Fargate.

Unlike basic Docker hosting projects, this deployment requires path-based routing through an AWS Application Load Balancer (ALB) and runtime zero-trust credential injection using AWS Secrets Manager — serving as the bridge before tackling full Kubernetes orchestration.

**Repo:** https://github.com/GfavourBraimah/auracare-health

## Table of Contents

- [Architecture Diagram](#architecture-diagram)
- [Company Brief](#company-brief)
- [Company Overview & The Problem](#company-overview--the-problem)
- [Project Objectives](#project-objectives)
- [What You Need to Understand](#what-you-need-to-understand)
- [What You Will Build (Deliverables)](#what-you-will-build-deliverables)
- [Repository and File Structure](#repository-and-file-structure)
- [Local Development](#local-development)
- [Weekly Schedule](#weekly-schedule)

## Architecture Diagram

> Add your architecture diagram image to `docs/images/architecture-diagram.png` and it will render automatically below.

![AuraCare Health architecture diagram](docs/images/architecture-diagram.png)

## Company Brief

| Field | Details |
|---|---|
| Company | AuraCare Health Systems |
| Sector | Healthcare Technology (HealthTech / Telehealth) |
| Infrastructure | Terraform, AWS ECS Fargate, ECR, ALB, RDS, Secrets Manager, Docker |
| Intern Track | DevOps — Intermediate Capstone |
| Project Duration | Two Weeks |
| Difficulty | Intermediate - Production containerization & compliance |

## Company Overview & The Problem

AuraCare Health Systems provides telehealth solutions, clinical scheduling portals, and automated insurance claim management. As a healthcare provider, they are legally mandated to protect electronic Protected Health Information (ePHI) under strict HIPAA regulations.

**Current State:** During a recent external cybersecurity audit, AuraCare received multiple severe non-compliance findings. Their monolithic APIs and PostgreSQL databases were bound to public IP addresses, and sensitive database passwords were hardcoded into `.env` files, creating massive security and compliance liabilities.

### Root Cause Analysis

| Root Cause | Detail |
|---|---|
| Public Attack Surface | Patient record APIs and databases run on public IPs. A single firewall mistake exposes Protected Health Information (ePHI) directly to the internet. |
| Hardcoded Credentials | Production database passwords are tracked in application `.env` files, violating zero-trust and compliance standards. |
| Monolith Blast Radius | All business logic runs together. A failure in the billing processor crashes the critical emergency patient records service. |
| Unscanned Container Images | Software releases are pushed directly to servers without automated vulnerability scanning, allowing known CVEs into production. |

## Project Objectives

By the end of this project, AuraCare's platform will be running as highly available, decoupled microservices with zero public exposure to its compute instances.

- **2-Tier VPC via Terraform:** Provision Public (ALB/NAT) and Private (ECS Tasks & RDS Database) subnets programmatically to ensure network isolation.
- **Serverless Container Orchestration:** Deploy the microservices using AWS ECS Fargate, eliminating the need to patch, manage, or scale underlying EC2 instances.
- **ALB Path-Based Routing:** Configure an AWS Application Load Balancer to route traffic dynamically to the correct backend service based on the URL path (e.g., `/api/patients` vs `/api/billing`).
- **Automated Image Security:** Push Docker images to Amazon ECR with "Scan on Push" enabled to block critical vulnerabilities from reaching production.
- **Zero-Trust Secrets:** Store PostgreSQL credentials in AWS Secrets Manager and use ECS IAM Task Roles to inject them dynamically into containers at boot time.
- **Modular Infrastructure as Code:** Structure all Terraform code using reusable, independent child modules (`modules/vpc`, `modules/ecs`, `modules/alb`) called by a root orchestrator.

### Why This Project Matters for Your Career

Modern enterprises are rapidly adopting serverless containers and managed load balancing. This project provides verifiable proof that you understand Docker multi-stage builds, container registry security, zero-trust secret management, and how to architect applications for strict regulatory compliance (HIPAA).

## What You Need to Understand

### New Concepts Reference Table

| Concept | Description | Status |
|---|---|---|
| AWS ECS (Fargate) | Serverless container compute engine. Runs your Docker containers in private subnets without requiring you to manage EC2 instances. | NEW |
| Amazon ECR | Secure, private Docker registry that stores container images and automatically scans them for CVE vulnerabilities. | NEW |
| ALB Path-Based Routing | Layer 7 routing that allows a single Load Balancer to send traffic to different microservices based on the URL (e.g., `/api/billing`). | NEW |
| Security Group Chaining | Configuring a database's security group to only allow traffic originating from the specific security group ID of the application tier. | NEW |
| AWS Secrets Manager | Centralized vault that injects sensitive database passwords directly into ECS tasks at boot, eliminating `.env` files. | NEW |
| Multi-Stage Docker Builds | A Dockerfile technique that separates the build environment from the runtime environment to create tiny, secure production images. | NEW |

## What You Will Build (Deliverables)

| Ref | Deliverable | Verification |
|---|---|---|
| D1 | 2-Tier VPC | `terraform apply` succeeds. AWS Console verifies public subnets route to IGW, and private subnets route to NAT Gateway. |
| D2 | Multi-Stage Dockerfiles | 4 Dockerfiles successfully build optimized images and run locally via Docker Compose. |
| D3 | ECR Vulnerability Scans | AWS ECR Console shows 4 pushed image repositories with 0 CRITICAL vulnerabilities. |
| D4 | Isolated RDS Database | AWS Console verifies RDS is in a Private Subnet with no public IP, and its Security Group is chained to the ECS tasks. |
| D5 | AWS Secrets Manager | IAM policies show least-privilege access, and the ECS Task Definition retrieves credentials dynamically. |
| D6 | ECS Fargate Cluster | AWS ECS Console shows a healthy cluster with 4 active Fargate tasks running. |
| D7 | ALB Target Groups | AWS EC2 Console shows 4 Target Groups containing registered IP targets in a healthy state. |
| D8 | Path-Based Routing | ALB Listener rules successfully map `/`, `/api/patients`, `/api/appointments`, and `/api/billing` to the correct Target Groups. |
| D9 | End-to-End Verification | The live web application loads successfully in the browser via the ALB DNS hostname. |
| D10 | Fault Tolerance Demo | Terminating the billing task does not disrupt the patient records service, proving domain isolation. |

## Repository and File Structure

```
auracare-health/
├── terraform/
│   ├── main.tf                     # Root orchestrator: calls child modules
│   ├── variables.tf                # Global environment inputs
│   ├── outputs.tf                  # Exports ALB DNS, VPC IDs
│   ├── terraform.tfvars            # Actual variable assignments (gitignored)
│   └── modules/
│       ├── vpc/                    # 2-Tier Network (Public, Private subnets, NAT)
│       ├── rds/                    # PostgreSQL instance in private subnets
│       ├── ecr/                    # Elastic Container Registries
│       ├── ecs/                    # Fargate Cluster, Task Definitions, IAM Roles
│       └── alb/                    # Application Load Balancer & Target Groups
├── services/
│   ├── patient-service/            # FastAPI (Patient Records)
│   │   └── Dockerfile
│   ├── appointment-service/        # Node.js (Scheduling)
│   │   └── Dockerfile
│   └── billing-service/            # FastAPI (Insurance Claims)
│       └── Dockerfile
└── frontend/                       # React 18 + Vite (Patient Portal)
    └── Dockerfile
```

## Local Development

Before provisioning any AWS infrastructure, the full stack can be run locally with Docker Compose: PostgreSQL, all three backend services (patient, appointment, billing), and the React frontend.

```powershell
# 1. Copy the environment template and adjust values if needed
Copy-Item .env.example .env

# 2. Build and start everything
docker compose up --build
```

Once running:

- Frontend: http://localhost:80
- Patient service health: http://localhost:8001/api/patients/health
- Appointment service health: http://localhost:3000/api/appointments/health
- Billing service health: http://localhost:8002/api/billing/health

Useful commands:

```powershell
docker compose ps                      # status of all containers
docker compose logs -f                 # tail logs from everything
docker compose down                    # stop and remove containers (keeps the postgres volume)
docker compose down -v                 # also wipe the postgres volume (full reset)
```

## Weekly Schedule

### Week 1 — Foundation & Microservice Containerization

- **Day 1 (Mon):** Clone the GitHub repository. Provision the Multi-AZ 2-Tier VPC, Route Tables, and NAT Gateway.
- **Day 2 (Tue):** Write multi-stage Dockerfiles for the frontend and backend microservices. Test locally using Docker Compose.
- **Day 3 (Wed):** Create Amazon ECR repositories, enable Scan on Push, and push all container images.
- **Day 4 (Thu):** Provision the isolated Amazon RDS PostgreSQL database and configure Security Group Chaining.
- **Day 5 (Fri):** Store database credentials in AWS Secrets Manager and configure the ECS IAM Task Execution Role.

### Week 2 — Serverless Orchestration & Path-Based Routing

- **Day 6 (Mon):** Provision the AWS ECS Fargate Cluster and write the Task Definitions referencing AWS Secrets Manager.
- **Day 7 (Tue):** Provision the Application Load Balancer (ALB) and create the 4 Target Groups.
- **Day 8 (Wed):** Configure ALB path-based Listener Rules and deploy the ECS Services into the private subnets.
- **Day 9 (Thu):** Perform end-to-end integration testing. Seed the database and verify zero public IP addresses on compute tasks.
- **Day 10 (Fri):** Conduct fault tolerance and self-healing tests. Record final demonstration video and submit.
