**hrmTimeTracking — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents any unauthenticated user visiting the platform. A guest has no organization context, no user account recognized by the system, and no access to any protected features such as viewing employees, logging time, or managing projects. Guests can only reach the sign-up and login pages. They may submit a registration form with an email and password to create a user account, or they may log in with existing credentials. Once authenticated, the guest transitions to a member actor and loses all guest-level restrictions. If registration or login fails due to invalid input (e.g., missing email, incorrect password), the guest receives an error message and remains in the unauthenticated state. A guest cannot browse, view, or interact with any organization data, employee records, timesheets, or reports. All API requests from guests without valid authentication tokens are rejected with an access-denied response.

### Guest Definition and Identity

A guest is any unauthenticated user who has not yet established a recognized identity within the system. Guests have no user account, no organization context, and no authentication token. The only identifying information a guest may provide is an email address and password submitted through the sign-up or login forms. The system does not associate any session, profile, or data with a guest. All guests are treated as anonymous, untrusted actors until they successfully authenticate.

**State**: unauthenticated — no session exists, no organization is selected, no access to protected features is granted.

### Guest Access Boundary

Guests are restricted to the following access points:

- **Sign-up page**: Guests may view and interact with the registration form to create a new user account.
- **Login page**: Guests may view and interact with the login form to authenticate with existing credentials.

All other features, pages, and API operations are protected. Guests attempting to access any protected feature — including but not limited to viewing employee lists, creating projects, logging time, submitting timesheets, viewing reports, or managing organization settings — receive an access-denied response. The system does not disclose any organization data, employee information, or resource content to guests. Guests cannot browse, search, or interact with any domain entity.

### Authentication Token Requirement

All protected features require a valid authentication token. The system issues an authentication token upon successful login (defined in Module 2 — Registration and Login). This token represents the authenticated user's identity and organization context. Guests do not possess a valid token. Every API request submitted by a guest is checked for a valid authentication token. If no token is provided, or the token is expired or invalid, the request is treated as a guest request and all protected feature restrictions apply.

Guests receive a clear access-denied response when their requests are rejected due to missing or invalid authentication.

### Sign-Up Error Handling

When a guest submits a sign-up form with an email and password, the system validates the submission before creating an account. The following conditions produce an error response, and the guest remains in the unauthenticated state:

- **Missing email**: The system rejects the submission if no email address is provided.
- **Invalid email format**: The system rejects the submission if the email format is not recognized (e.g., missing "@" symbol).
- **Missing password**: The system rejects the submission if no password is provided.
- **Duplicate email**: If the email address is already associated with an existing user account, the system rejects the submission and notifies the guest that the email is already registered.

Upon receiving an error, the guest sees a clear message indicating what was invalid and is given the opportunity to correct the input and resubmit. Successful registration transitions the guest to an authenticated member (defined in Module 3 — Account Management).

### Login Failure Feedback

When a guest submits login credentials (email and password), the system validates them before establishing a session. The following conditions produce an error response, and the guest remains in the unauthenticated state:

- **Missing email**: The system rejects the request if no email is provided.
- **Missing password**: The system rejects the request if no password is provided.
- **Incorrect credentials**: If the email does not match any existing account, or the password does not match the stored password for the provided email, the system rejects the request with a generic failure message (e.g., "Invalid email or password" — the system does not disclose whether the email exists or the password is wrong, to prevent account enumeration).

Upon receiving an error, the guest sees the failure message and may correct their input and retry. Successful authentication transitions the guest to a member actor with an authentication token and organization context (defined in Module 2 — Registration and Login).

### Guest-to-Member Transition

The transition from guest to member occurs at the moment of successful authentication, which happens in two scenarios:

1. **After successful registration**: When a guest submits a valid sign-up form and the system creates their user account, the guest is immediately authenticated and transitions to a member actor. The system issues an authentication token and the user is now recognized.

2. **After successful login**: When a guest submits valid credentials matching an existing user account, the system issues an authentication token and the guest transitions to a member actor.

Upon transition:
- The guest identity is replaced by the member identity associated with the authenticated user account.
- An authentication token is issued for subsequent requests.
- The user may now select an organization context (if they belong to one or more organizations) or create a new organization.
- All guest-level restrictions are lifted, and the user gains access to features permitted by their role within their selected organization.

Until the guest successfully authenticates, they remain in the guest state with all access boundaries in effect.

## member Actor

The member actor is any authenticated user who has logged into the platform with valid credentials. A member may belong to zero, one, or multiple organizations. Upon login, the member selects which organization to operate in, and all subsequent actions are scoped to that organization. Each member within an organization has an employee record and is assigned exactly one role — either one of the three built-in roles (Owner, Manager, Employee) or a custom role created by the organization owner. The role determines which permissions the member has within that organization. A member with no associated employee record (e.g., a user who signed up but has not been invited to any organization) can access only their global profile settings. Members who belong to multiple organizations can switch their active organization context without logging out. A member's access to features is strictly bounded by their role's permission set — attempting to perform an action without the required permission results in an access-denied response. Members can also delete their own account under specific conditions related to organization ownership.

### Authenticated User Identity

A member is any authenticated user who has successfully logged into the platform with valid email and password credentials (login mechanics are defined in Registration and Login). Upon authentication, the system recognizes the user as a member and grants access to features based on their organizational memberships and assigned roles. The member's authenticated identity persists across the session (session lifecycle is defined in Session and Logout).

### Organization Context and Multi-Organization Membership

A member may belong to zero, one, or multiple organizations. On initial login, the member selects an organization to operate in, establishing the active organization context. All subsequent actions are scoped to that organization. Members who belong to multiple organizations can switch their active organization context at any time without logging out — the current session remains active while the organization context changes. When a member has no associated organization (e.g., a newly registered user not yet invited to any organization), only global profile settings are accessible.

### Employee Record and Role Association

Within each organization a member belongs to, the member has an associated employee record (employee record structure is defined in 02-domain-model.md). That employee record is assigned exactly one role. The role may be one of the three built-in roles — Owner, Manager, or Employee — or a custom role created by an organization owner (custom role definition is defined in 02-domain-model.md). Built-in roles carry fixed permission sets that cannot be modified. Custom roles carry a configurable set of permissions selected from the available permissions listed in 02-domain-model.md. A member's role within an organization may be changed by any user who holds the employee:manage permission. The member's permissions within an organization are determined solely by the permission set of their assigned role.

### Role-Based Access Boundary

Every action a member performs within an organization is subject to permission checking against their assigned role's permission set. If a member attempts to perform an action for which their role lacks the required permission, the system rejects the request with a permission-denied response. This boundary exists for every feature: creating projects, approving timesheets, viewing employee data, managing organization settings, and all other operations. The permission check occurs before any data is read or written — an unauthorized request is rejected without side effects.

### Account Deletion Conditions

A member may delete their own user account (account deletion mechanics are defined in Account Management). The system enforces the following conditions before allowing deletion:

- If the member is the sole owner of any organization, they must either transfer ownership to another member of that organization, or delete the organization first (organization deletion conditions are defined in 04-business-rules.md).
- Once the account is deleted, the member's employee records in all other organizations are marked as deactivated. Historical data (timelogs, timesheets) associated with those employee records is preserved, but the records are no longer linked to an active user account.

### Global Profile Access

Every member has a global user profile that exists independently of any organization. The profile contains: display name, avatar image, and phone number. This profile is shared across all organizations the member belongs to — changing the profile in one organization context updates it for all organizations. Members can edit their own profile at any time, regardless of their organizational role or employee status. Profile access does not require an active organization context.

### Scoped Organization Operations

All operations performed by a member while an organization context is active are strictly scoped to that organization. A member cannot view, create, modify, or delete data belonging to another organization, even if they are also a member of that other organization. To operate on a different organization's data, the member must first switch their active organization context. The system enforces this scoping on every request — data from the active organization is never mixed with data from other organizations the member may belong to.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Guests can sign up by providing an email address and a password. The email address must not already be associated with an existing user account.

During registration, the user may optionally create a new organization by providing its name, description, logo image, currency, timezone, and fiscal start month. The registering user automatically becomes the owner of the created organization.

If the email address matches a pending invitation (see Invitation entity in 02-domain-model.md), the new account is automatically added to those organizations as an employee with the role specified in the invitation. The user is notified of these auto-accepted memberships upon successful registration.

Upon successful registration, the user is authenticated and proceeds to select an organization context (see User Login section).

If the email address is already in use, the registration request is rejected.

If the provided email address format is invalid, the registration request is rejected.

### User Login

Users log in by providing their registered email address and password. If the credentials are valid, the user is authenticated.

A user may belong to one or more organizations. After successful authentication, the user must select an organization to work in. This selection establishes the organization context for all subsequent actions within the session.

If the user belongs to only one organization, that organization is selected automatically. If the user belongs to multiple organizations, the system presents a list of organizations for the user to choose from.

The organization context persists for the duration of the session. Users can switch to a different organization without logging out (see Module 2: Session and Logout).

If the email address does not match any registered account, the login attempt is rejected.

If the password does not match the registered account, the login attempt is rejected.

### Authentication

Authentication is based on verifying a user's email address and password pair against their registered account. No alternative authentication methods are supported.

The authentication flow proceeds as follows:

1. The user supplies their email address and password
2. The system verifies the email address exists in the system
3. The system verifies the password matches the stored credentials for that email address
4. Upon successful verification, the user is considered authenticated

An authenticated session begins after successful credential verification followed by organization context selection (see User Login).

The authentication mechanism applies uniformly across all system access points, including web interface and API access.

Failed authentication attempts do not affect the account's status or lock the account. No rate limiting or account locking is applied based on failed attempts.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user logs in successfully, the system creates a session to maintain their authentication state across requests. The session preserves the organization context that the user selected at login — all subsequent actions are scoped to this organization.

While the session is active, users can switch their active organization without logging out. Changing the organization context updates the session and limits all subsequent operations to the newly selected organization.

### Logout

Users can log out of their session at any time from within the application. Logging out ends the session and clears the organization context. After logout, the user is redirected to the login page and must re-authenticate to access the application.

Logging out from one device or browser does not affect sessions on other devices — each session is independent.

### Session Security

When a user changes their password, all existing sessions on other devices are invalidated, requiring those devices to log in again with the new password.

When a user deletes their account (as described in Account Management), all active sessions across all devices are immediately invalidated.

Session identifiers are never exposed in URLs or visible to other users.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

When a person signs up for the first time, they provide an email address and a password. The system creates a user account using the email as the unique identifier — no two accounts can share the same email address. A global user profile is established simultaneously with empty fields for display name, avatar image, and phone number. The profile is shared across all organizations the user later joins. During this initial sign-up, the user also creates their first organization, as described in [02-domain-model.md].

### Account Deletion

A user may permanently delete their account. Before deletion proceeds, the system checks whether the user is the sole owner of any organization. If the user is the sole owner of one or more organizations, they must either transfer ownership to another member or delete each such organization first, subject to the organization deletion rules defined in [02-domain-model.md]. Deletion is blocked until all ownership conditions are satisfied. Once the conditions are met, the account and all associated personal data are permanently removed. For organizations where the user was an employee but not the owner, the employee record is marked as "deactivated." Historical timelogs, timesheets, and contracts from those organizations are preserved in read-only state.

### Password Change

An authenticated user may change their password by providing their current password and a new password. The system verifies that the current password matches the stored credential. If the current password is incorrect, the change is rejected. If verification succeeds, the system updates the stored credential to the new password.