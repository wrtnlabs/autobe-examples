**shoppingMall — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents a person who has not registered an account and therefore cannot use any account-protected features. The guest is identified only by their unauthenticated interaction with the platform, without any customer, seller, or administrator identity attached. Guests have no permission to log in, sign up, or perform actions that require authentication. Guests are blocked from viewing or managing any personalized or account-linked content. Any attempt to access features that require a registered account should be denied or redirected so the user understands registration is required. The guest experience should make it clear that registration is necessary before participating in the marketplace. If a guest tries to perform operations reserved for customers or sellers, the platform should treat the user as unauthenticated and deny access. Overall, the guest role is a boundary state that prevents misuse of protected areas until the user becomes a registered actor.

### Guest Identity and Scope

The guest actor represents an unauthenticated visitor who has not registered an account on the platform.
The platform must treat the guest as having no customer identity, no seller identity, and no administrator identity.
The guest identity exists only for the purpose of allowing unauthenticated browsing and must not be treated as an authenticated account.
If a person is not authenticated, the platform must consider them as a guest for access control purposes.
If a person is authenticated as any registered actor, they must not be treated as a guest for protected-feature access control.

### No Account Permissions for Guest

While the user is a guest, the platform must not grant any account permissions reserved for registered customers or sellers.
The platform must deny any action that requires a registered account while the user remains unauthenticated.
The platform must deny any action reserved for customers or sellers (for example, account-specific management or purchase actions) when the user is a guest.
If a guest attempts an account-protected action, the system must treat the user as not logged in and refuse access.

### Access Boundary for Account-Protected Features

Protected features must be accessible only to registered customers or registered sellers, not to guests.
The platform must enforce an access boundary such that guests cannot view or manage account-linked content (including any personalized content tied to a customer or seller account).
The platform must block guests from any customer-only or seller-only pages and functions.
If a guest tries to reach a protected feature, the system must deny access and guide the user toward registration as the required step to participate.

### Registration Required to Participate

Registration must be required before a user can use any features that depend on being a registered customer or seller.
The platform must make it clear to the guest that registration is necessary before participating in marketplace activities that require an account.
If a guest attempts to use a customer or seller capability without being registered, the system must reject the attempt and require registration to proceed.

### Unauthenticated Access Restrictions

The platform must consistently apply unauthenticated access restrictions across all navigation paths.
If a guest attempts to perform operations reserved for authenticated customers or sellers, the platform must deny access.
If a guest is redirected or shown information that is intended to be account-protected, that content must not be accessible without registration and authentication.
The platform must not allow a guest session to perform account changes (such as changing profile details) or other protected actions.

## member Actor

The member actor represents a registered user account that can participate in the platform as either a customer or a seller, depending on how the account was created and approved. A member is identified by having an authenticated identity tied to an email-based account, but without administrator-level authority. As a member, the user has permission to access the parts of the platform intended for regular participation, such as features that are available after registration and login. The member’s access is limited by their account status and role: seller access depends on administrator approval status, while customer access depends on being an active customer account. Member accounts can also be subject to restrictions such as being banned, which prevents them from logging in while leaving already-existing business activity unaffected where applicable. Within the member category, the platform distinguishes access boundaries so that administrators can still oversee and control sensitive capabilities. If an action is attempted that exceeds the member’s role boundaries—such as trying to perform administrative management—the platform should refuse access. In short, the member actor is the primary authenticated boundary for normal platform usage, constrained by role, approval status, and account restrictions.

### Registered member user identity

A member is a registered account on the platform identified by an authenticated email-and-password identity (defined in member actor scope for regular participation). The platform must treat the member as the primary identity boundary for any actions initiated by the user after registration and login.

If the user has not completed registration, the platform must not provide member-level access to any protected participation features; the platform must require registration before enabling member participation.

### Authenticated access requirement for participation

While a user is not authenticated, the platform must deny access to member participation features and must not allow member actions.

WHEN the member successfully logs in, the platform must treat subsequent requests as originating from that authenticated member identity until the member logs out or the authentication ends.

If the member’s authentication is not valid for the attempted action, the platform must deny the action as a member participation feature.

### Customer role as member (role within membership)

A member may participate as a customer role within the platform.

When a member is acting as a customer role, the platform must allow actions intended for regular customer participation while keeping the member’s access restricted to non-administrator capabilities.

If the member attempts an action intended for seller or administrator responsibilities while in customer role, the platform must refuse access.

### Seller role as member (role within membership)

A member may participate as a seller role within the platform.

When a member is acting as a seller role, the platform must allow actions intended for regular seller participation while keeping the member’s access restricted to non-administrator capabilities.

If the member attempts an administrative management action while in seller role, the platform must refuse access.

### Seller approval status affects member seller access

Seller participation access for a member in the seller role depends on administrator approval status.

WHILE the seller approval status is pending, the platform must restrict seller participation such that seller actions are not allowed beyond viewing the approval status.

WHILE the seller approval status is approved, the platform must allow seller participation features intended for regular sellers.

WHILE the seller approval status is rejected, the platform must restrict seller participation and must allow the member to view the rejection reason.

If a rejected seller wants to become eligible again, the platform must allow submitting a new seller registration request; the platform must continue to apply the approval-status restrictions until approval is granted.

If a member in seller role attempts a restricted seller action that is not permitted by the current approval status, the platform must refuse access.

### Regular participation permissions and boundary below administrator

The platform must define member access boundaries so that member participation is allowed only for capabilities intended for regular users and does not include administrator-only management.

Any action categorized as administrator-level management must be inaccessible to members.

If a member attempts administrator-only management, the platform must refuse access.

Access boundaries must allow administrators to oversee and control sensitive capabilities even when the acting user is a member.

### Banned member login denied (account restriction limits access)

If a member account is banned, the platform must deny login for that member.

WHILE the member is banned, the platform must deny access to member participation features, even if the member attempts to access protected areas.

If the platform has previously enabled member participation for an account, banning must act as an access restriction that prevents new logins and ongoing participation attempts.

### Role-based access refusal for member-only scope

If the requested action is outside the member’s permitted scope (for example, administrator-only management), the platform must refuse access.

If the requested action is within member participation scope but the member’s current role/approval conditions do not permit it (customer vs seller, or seller approval status), the platform must refuse access.

The platform must ensure refusal is based on the member’s role boundaries and account restriction limits, not on hidden or implicit assumptions about the user.

## admin Actor

The admin actor represents an authenticated administrator account with authority to manage platform governance beyond regular member participation. An admin is identified by an administrator-grade identity, which can be either regular administrator or super administrator. Administrators have permission boundaries that allow oversight of customer and seller accounts, governance decisions, and platform-level moderation tasks that regular members cannot perform. A super administrator has additional permission boundaries to change administrator grades, while regular administrators do not have that elevated authority. Admin accounts may also be restricted by admin-grade rules, including protections such as the inability for super administrators to demote themselves. The admin’s access is therefore determined not only by authentication, but also by grade and governance rules. If an administrator attempts an action outside their grade permissions—for example, a capability only allowed to super administrators—the platform should deny access. Admin access should never be treated as a member-level permission; it is distinct and higher, with explicit boundaries to protect critical governance functions. Overall, the admin actor is the controlled governance role that can manage approval, oversight, and enforcement processes within defined authority limits.

### Administrator identity and authentication context

An administrator is an authenticated administrator account identity on the platform.
An administrator account has an administrator grade that determines its governance scope.
The administrator grade can be either regular administrator or super administrator.
An administrator’s abilities are evaluated using both authentication state and administrator grade.
If an account is not authenticated as an administrator, it cannot be treated as an administrator for governance actions.

### Admin role permissions and access boundary for governance

Administrators have authority to manage platform governance functions beyond regular member participation.
Administrators can oversee customer and seller accounts and can make governance decisions that regular members cannot.
A super administrator has additional governance authority beyond regular administrators.
While an administrator has elevated authority, that authority is still bounded by their administrator grade and governance authority boundary.
Any governance action that is outside the administrator’s allowed grade scope must be denied.

### Administrator grades: regular administrator authority

A regular administrator can perform governance actions that are allowed for regular administrators within the platform’s governance authority boundary.
A regular administrator cannot perform actions that are reserved for super administrators.
When a regular administrator attempts a grade-restricted governance action reserved for super administrators, the platform must deny the action.

### Administrator grades: super administrator elevated authority

A super administrator can perform all governance actions available to regular administrators.
A super administrator has additional elevated governance authority to manage administrator-grade changes.
A super administrator can promote regular administrators to super administrators.
A super administrator can demote super administrators to regular administrators, except when the target is the acting super administrator themselves.
When a super administrator attempts a grade change that is not allowed by the self-demotion prohibition rule, the platform must deny the action.

### Super admin promotion and demotion rules (state transitions)

When a super administrator promotes a regular administrator, the promoted administrator’s grade changes from regular administrator to super administrator.
When a super administrator demotes a regular administrator, that action is not applicable because demotion applies to super administrators.
When a super administrator demotes another super administrator, that demoted administrator’s grade changes from super administrator to regular administrator.
The acting super administrator cannot demote themselves.
The platform must enforce these grade change rules consistently whenever grade changes are requested.

### Permission denial for grade-restricted actions

If an administrator attempts a governance action that is restricted to a higher grade than the administrator currently has, the platform must deny access to that action.
If a grade-restricted governance action is denied, the platform must not perform the action.
Access boundary enforcement must be based on administrator grade rules, not on any other factor.
Denial must apply even if the acting administrator can otherwise perform some governance actions.

### Self-demotion prohibition

A super administrator is prohibited from demoting themselves.
If a super administrator requests a grade change that would result in themselves becoming a regular administrator, the platform must deny the request.
The prohibition applies regardless of reason or intent provided with the request.

### Admin-only oversight scope (authenticated admin-only capabilities)

Authenticated administrators have an admin-only oversight scope that allows them to oversee platform governance beyond regular member participation.
Admin-only oversight scope includes oversight of customer accounts and seller accounts.
Admin-only oversight scope includes governance decisions that affect approval and enforcement of platform governance.
No guest or member account may use admin-only oversight capabilities; only authenticated administrator accounts may access them.
Any request for admin-only oversight capabilities from a non-administrator account must be denied.

### Governance authority boundary enforcement (business flow)

flowchart LR
    A["Authenticated administrator"] --> B["Check governance authority boundary"]
    B --> C["Grade allows action"]
    C --> D["Allow governance action"]
    B --> E["Grade does not allow action"]
    E --> F["Deny action"]

The platform must evaluate governance authority boundary requirements before allowing any grade-restricted governance action.
If grade does not allow the action, the platform must deny it and must not apply any governance outcome that would result from the action.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration (Customers and Sellers)

#### Customer registration
Members can register for a customer account.
The customer registration process requires an email address and a password.
If the email address is already associated with an existing account, the registration request is rejected.
If the password is missing or empty, the registration request is rejected.
When registration succeeds, the account is created and can be used to log in.

#### Seller registration (pre-approval)
Members can register for a seller account.
The seller registration process requires an email address and a password.
When registration succeeds, the seller account is created in a pending approval state.
If the email address is already associated with an existing account, the registration request is rejected.
If the password is missing or empty, the registration request is rejected.

#### Account visibility during seller approval
Sellers can view their approval status (pending, approved, rejected).
If the seller approval status is rejected, the seller can view the rejection reason.
If a seller is rejected, the seller can submit a new registration request.

#### Registration failure handling
If a registration request is rejected, the system must return feedback describing that the request could not be completed and must not create or modify an account.

### Login (Authentication for Customers and Sellers)

#### Login allowed only for approved and not banned/suspended accounts
Members can log in to their account using email and password.
Customers can log in when their account is active.
Sellers can log in only when their seller approval status is approved.
If a customer is banned, the customer cannot log in.
If a seller is banned, the seller cannot log in.
If a seller is suspended, the seller cannot log in.

#### Credential validation
When a member attempts to log in, the system must validate the provided email and password.
If the email does not match any account, the login request is rejected.
If the email matches an account but the password is incorrect, the login request is rejected.

#### Authentication success
After a successful login, the member is treated as authenticated for accessing authenticated features.
The system must associate the authenticated session with the correct account type (customer or seller) based on the account that was used to log in.

#### Login failure handling
If a login request is rejected, the system must not create an authenticated session.

### Authentication State (Authenticated vs Unauthenticated Access)

#### Registration required to participate
Guests cannot access any customer or seller features because registration is required to use features.
Any action that requires authentication must be blocked for unauthenticated visitors.

#### Role-appropriate authenticated access
When an authenticated member is a customer, the member is allowed to use customer features.
When an authenticated member is a seller, the member is allowed to use seller features.
When an authenticated member is an administrator, the member is allowed to use administrator features.

#### Authentication consistency after account changes
If a seller is rejected after registration, the seller must not be able to log in.
If a seller is suspended, the seller must not be able to log in.
If an account is banned, the account holder must not be able to log in.

#### Unauthenticated error conditions
If a member attempts to access an authenticated-only feature without being authenticated, the system must deny access and indicate that login is required.

### Authentication Error Scenarios and User Feedback

#### Clear rejection feedback
If registration or login is rejected due to missing required inputs, the system must provide feedback indicating that required information is missing.
If login is rejected due to incorrect credentials (email not found or password mismatch), the system must provide feedback indicating that authentication could not be completed.

#### Prevent unintended account creation
If any step in registration fails validation, the system must not create a partial or unusable account.

#### Re-login after failed attempts
After a failed login attempt, the system must continue to allow the member to attempt login again.

#### Seller approval related feedback
If a seller attempts to log in while the seller approval status is not approved, the system must reject the login and provide feedback that approval is required.
If a seller approval status is rejected, the system must allow the seller to view the rejection reason as part of their account status viewing.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Establishment After Login

Customers (members) and sellers (members) can access the platform’s authenticated features only after successfully logging in.

When a customer or seller submits login with their email and password and authentication succeeds, the system creates an authenticated session for that customer or seller.

The authenticated session must be tied to the correct account (customer or seller) that provided the login credentials.

If authentication fails, the system must not create an authenticated session and must not grant access to authenticated features.

Customers and sellers must remain signed in for their session until they explicitly log out or their session ends due to the configured session policy.

While a session is active, the system must consistently treat the user as the authenticated customer or seller for authorization checks across all features that require authentication (e.g., profile editing, product creation for sellers, and order-related actions).

### Session Usage Across the Platform

While an authenticated session is active, the system must allow the signed-in customer or seller to use authenticated features according to their role (customer, seller, administrator).

The system must reject actions that require authentication when there is no active authenticated session.

When a customer or seller starts a new login while they already have an active session, the system must continue to operate according to the latest successful login session, ensuring the user remains authenticated as the correct account.

For administrator capabilities, the system must only provide administrative actions when the authenticated session belongs to an administrator user.

If an authenticated account has been deleted or is otherwise not allowed to operate (e.g., a banned customer or suspended seller), the system must prevent authenticated sessions from being used to perform prohibited actions.

### Logout Behavior

When a signed-in customer or seller requests logout, the system must end the current authenticated session.

After logout completes, the system must treat the user as unauthenticated and must prevent access to authenticated features.

If a user attempts to perform an authenticated action after logout, the system must reject the action due to missing authentication.

Logout must not delete the user’s account; it must only end the current session.

Logout for an administrator must similarly end the administrator session so that administrative actions are no longer permitted after logout.

### Account Security: Password Change and Login Validity

Customers and sellers can change their password.

After a customer or seller changes their password, any subsequent login must require the new password.

If a login attempt is made with an old password after a password change, the system must reject authentication.

If a customer or seller deletes their account, the system must ensure that the deleted account cannot be used for future logins.

If a seller account is deleted, the seller must not be able to establish a new authenticated session afterward.

If an administrator user is banned or otherwise prevented from logging in, the system must reject login attempts and must not create an authenticated session.

Deleted or banned accounts must not be treated as authenticated even if the user still attempts to act while not properly logged in.

### Account Deletion and Session Termination

When a customer deletes their account, the system must ensure the customer is no longer able to use the account to access authenticated features.

When a seller deletes their account, the system must ensure the seller is no longer able to use the account to access authenticated features.

After an account is deleted, any existing authenticated session for that account must be invalidated so that the user cannot continue using authenticated features.

If an account deletion is rejected or cannot be completed due to business constraints (such as restrictions for seller deletion), the system must keep the account active and must not invalidate existing sessions as part of the rejected deletion attempt.

### Session and Logout Flow

flowchart LR
    A["Unauthenticated"] -->|"Submit login with email and password"| B["Authenticated session created"]
    B -->|"User requests logout"| C["Session ended"]
    C -->|"User tries to use authenticated feature"| D["Action rejected: not authenticated"]

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Registration and Account Creation

Customers and sellers must be able to create an account by registering with an email and a password.

Customers must be able to log in using their email and password after registration.
Sellers must be able to log in using their email and password after registration.

Seller registration must not immediately grant selling privileges: seller accounts require administrator approval before they can sell.
Sellers must be able to view their administrator approval status (pending, approved, or rejected).

When a seller registration is rejected, sellers must be able to view the rejection reason.
Rejected sellers must be able to submit a new registration request.

If an email/password login attempt cannot be completed (e.g., credentials do not match an existing account), the system must reject the login attempt.

If an account is created with invalid or missing registration inputs (email or password), the system must reject the registration attempt.

### Password Change

Authenticated customers must be able to change their password.
Authenticated sellers must be able to change their password.

When changing a password, the system must reject the request if the required password change inputs are missing.

After a successful password change, the user must be able to log in with the updated password.

If a password change request is rejected, the user must not be left in an ambiguous state; their existing login ability must remain with the prior password until the change is successfully completed.

### Account Deletion (Customer and Seller)

Customers must be able to delete their own customer account.
Sellers must be able to delete their own seller account subject to eligibility rules.

When a customer deletes their account:
- The customer profile information must be deleted.
- The customer’s orders and order history must be preserved for seller records and legal purposes.
- The customer’s reviews must be preserved but shown as "deleted user".

When a seller deletes their account:
- The seller’s products must be deleted from listings.
- Order history and snapshots must be preserved.
- The seller’s shop name in past orders must be preserved.

Seller account deletion must be allowed only when the seller has no pending orders that are in a paid or shipped status.
Seller account deletion must be allowed only when the seller has no pending cancellation or refund requests.

If a seller attempts to delete their account while any of the required conditions are not met (pending paid/shipped order items or pending cancellation/refund requests), the system must reject the deletion request.

Account deletion must not remove the ability for dispute resolution that depends on snapshots: snapshots relevant to preserved order history must remain viewable by relevant parties for dispute resolution.

The system must present clear outcomes for both successful account deletion and rejected deletion attempts, including the reason for rejection when deletion is blocked by pending orders or pending cancellation/refund requests.