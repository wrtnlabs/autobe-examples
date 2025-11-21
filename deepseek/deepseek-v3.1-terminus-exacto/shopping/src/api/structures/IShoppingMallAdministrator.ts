import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallAdministrator {
  /**
   * Registration data structure for creating new administrator accounts in
   * the shopping mall platform with comprehensive security and accountability
   * measures.
   *
   * Contains all required information for administrator registration
   * including authentication credentials, personal identification, role
   * assignment, and initial account configuration. The registration process
   * ensures proper security validation including email uniqueness
   * verification, password strength requirements, and role-based permission
   * assignment.
   *
   * Security considerations include proper password handling through bcrypt
   * hashing algorithm, email validation to prevent duplicate accounts, and
   * role-based permission assignment following predefined security policies.
   * The registration workflow supports different account statuses for
   * activation workflows and security verification processes.
   *
   * Administrator accounts require elevated security measures including
   * strong password policies, role-based access control, and proper audit
   * trail establishment through first_name and last_name fields for
   * identification and accountability purposes.
   */
  export type ICreate = {
    /**
     * Administrator email address used for authentication and system
     * notifications. Must be unique across all administrators and validated
     * against RFC 5322 email format standards. This email serves as the
     * primary authentication identifier and communication channel for
     * system alerts and administrative notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for administrator authentication that will be
     * securely hashed before storage. Must meet strong password
     * requirements including minimum length, complexity, and character
     * diversity. The system uses bcrypt algorithm with enhanced security
     * measures for password hashing and storage.
     */
    password: string;

    /**
     * Administrator's first name for identification and accountability
     * purposes. Used for professional identification in system logs, audit
     * trails, and user-facing interfaces where administrator accountability
     * is required.
     */
    first_name: string;

    /**
     * Administrator's last name for professional identification and
     * accountability tracking. Combined with first_name to create complete
     * identification for audit purposes and system administration
     * accountability.
     */
    last_name: string;

    /**
     * Administrator role defining access permissions and system
     * capabilities. Valid values: super_admin (full system access),
     * support_admin (customer support functions), security_admin (security
     * and compliance oversight). Role assignment follows predefined
     * permission sets and access control policies.
     */
    role: string;

    /**
     * JSON string containing specific permission sets for role-based access
     * control. Defines granular permissions for administrative functions,
     * system configuration access, and user management capabilities. The
     * permissions structure follows predefined schema for role-based
     * security enforcement.
     */
    permissions: string;

    /**
     * Initial account status for new administrator registrations. Valid
     * values: active (immediately usable), suspended (temporarily
     * disabled), pending_activation (requires activation workflow). Default
     * status is typically pending_activation for security verification.
     */
    status?: string | undefined;
  };

  /**
   * Login credentials for administrator authentication with comprehensive
   * security context and audit trail capabilities.
   *
   * Contains email and password for credential verification against stored
   * bcrypt-hashed password_hash in the shopping_mall_administrators table.
   * The authentication process includes account status validation to ensure
   * only active administrators can authenticate, rejecting suspended or
   * pending accounts for security reasons.
   *
   * Security context fields (ip, href, referrer) provide essential audit
   * trail information for security monitoring and incident investigation.
   * These fields enable proper session tracking, security event correlation,
   * and authentication pattern analysis across the platform.
   *
   * The authentication system implements rate limiting, credential
   * validation, and session management with JWT token generation for secure
   * access to administrative functions. Successful authentication generates
   * access and refresh tokens with appropriate expiration times for session
   * continuity and security compliance.
   */
  export type ILogin = {
    /**
     * Administrator email address used for authentication credential
     * verification. Must match an existing administrator account email in
     * the system database. The email serves as the primary identifier for
     * authentication lookup and account verification.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for authentication verification against stored
     * bcrypt-hashed password_hash. The system performs secure password
     * comparison using bcrypt algorithm to validate credentials without
     * exposing stored hash values. Password validation includes account
     * status checks and security policy enforcement.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring. While
     * optional as servers can extract this information, providing it
     * explicitly enables enhanced audit trail capabilities and security
     * event correlation across distributed systems.
     */
    ip?: string | undefined;

    /**
     * Connection URL where the authentication request originated for
     * security context tracking. Provides valuable audit information for
     * investigating authentication attempts and identifying potential
     * security incidents or unauthorized access patterns.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that directed to the authentication page for user
     * journey tracking. Helps establish authentication context and supports
     * security investigations by providing complete request flow
     * information.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Refresh token request for maintaining administrator session continuity
   * with enhanced security context.
   *
   * Used to validate existing refresh tokens and issue new access tokens
   * without requiring re-authentication. Supports continuous administrative
   * access while maintaining security through periodic revalidation of
   * account status and permissions.
   *
   * Includes session context information (IP address, connection URL,
   * referrer) for comprehensive security monitoring and audit trail creation.
   * These fields enable proper tracking of refresh request origins and help
   * detect suspicious activity patterns.
   *
   * Security considerations include refresh token validation against stored
   * session information, account status verification, and proper token
   * expiration management. The operation ensures administrator accounts
   * remain active and have not been suspended since the original
   * authentication.
   */
  export type IRefresh = {
    /**
     * Refresh token string used for generating new access tokens without
     * requiring re-authentication. This token maintains session continuity
     * while ensuring security through periodic revalidation.
     */
    refresh_token: string;

    /**
     * Client IP address for session tracking and security monitoring. Used
     * for audit trail and security incident investigation.
     */
    ip?: string | undefined;

    /**
     * Connection URL where the refresh request originated. Required for
     * proper session context and security validation.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that directed to the refresh endpoint. Used for security
     * analysis and user journey tracking.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Summary view of administrator information for support ticket assignment
   * contexts.
   *
   * Provides essential identification and contact information for
   * administrators assigned to support tickets, enabling proper agent
   * tracking and responsibility assignment.
   */
  export type ISummary = {
    /** Primary identifier for the administrator. */
    id: string & tags.Format<"uuid">;

    /** Display name of the administrator. */
    name: string;

    /** Contact email address for the administrator. */
    email: string & tags.Format<"email">;

    /** Administrative role and permissions level. */
    role: string;
  };

  /**
   * Authentication response containing comprehensive administrator
   * information and session tokens for secure platform access.
   *
   * Returned after successful login or token refresh operations. Contains JWT
   * tokens for API access along with complete administrator profile
   * information for client-side display and permission validation.
   *
   * Includes both access and refresh tokens for session management, essential
   * administrator details for UI rendering, and role-based permission
   * information for access control decisions. The response provides all
   * necessary information for administrative dashboard display and subsequent
   * authenticated API operations.
   *
   * Security considerations include proper token expiration management,
   * account status verification, and permission-based access control. The
   * response structure ensures client applications have complete context for
   * rendering administrative interfaces and enforcing security policies.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator account.
     * Generated automatically upon registration using UUID v4 format.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Authenticated administrator profile information including
     * identification details and role-based permissions.
     */
    administrator: IShoppingMallAdministrator.ISummary;
  };
}
