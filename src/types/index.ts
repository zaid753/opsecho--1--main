export enum Role {
  BACKEND_ENGINEER = "BACKEND_ENGINEER",
  FRONTEND_ENGINEER = "FRONTEND_ENGINEER",
  SRE_DEVOPS = "SRE_DEVOPS",
  SUPPORT_ENGINEER = "SUPPORT_ENGINEER",
  PRODUCT_MANAGER = "PRODUCT_MANAGER",
  INCIDENT_COMMANDER = "INCIDENT_COMMANDER",
  OBSERVER = "OBSERVER",
  ADMIN = "ADMIN"
}

export enum IncidentStatus {
  CREATED = "CREATED",
  ACTIVE = "ACTIVE",
  MITIGATING = "MITIGATING",
  MONITORING = "MONITORING",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
