import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallAdmin {
  /**
   * Administrator account creation configuration for platform management with
   * comprehensive oversight capabilities, security controls, and role-based
   * permissions.
   *
   * Administrative accounts provide platform-wide oversight including seller
   * verification workflows, content moderation responsibilities, user
   * management functions, dispute resolution processes, system configuration
   * management, and comprehensive marketplace monitoring. Account
   * establishment configures operational scope, permission assignments, and
   * security boundaries for administrative activities.
   *
   * Role-based access control ensures appropriate operational delegation
   * across different administrative functions from department-specific
   * operational support to platform-wide oversight and super-administrator
   * authority. Security implementation follows enterprise standards with
   * password hashing, audit trails, and access control mechanisms.
   *
   * Password security requires computational hashing with appropriate cost
   * factors for administrative-level security requirements. Department
   * assignment enables organizational workflow coordination while maintaining
   * accountability systems and comprehensive access controls across the
   * marketplace platform ecosystem.
   */
  export type ICreate = {
    /**
     * Administrative email address for secure authentication and platform
     * management access. Must be unique across all administrator accounts
     * and follows RFC 5322 email format standards.
     */
    email: string & tags.MaxLength<255> & tags.Format<"email">;

    /**
     * Administrator first name for identification and professional
     * communication. Used in system notifications, audit trails, and
     * administrative interfaces for proper identification.
     */
    firstname: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Administrator last name for complete identification and authorization
     * records. Combined with first_name for full administrator
     * identification across platform management interfaces.
     */
    lastname: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Administrative privilege level determining access scope, operational
     * permissions, and system capabilities within the platform hierarchy.
     */
    adminlevel: "super_admin" | "department_admin" | "support_admin" | "viewer";

    /**
     * Administrative department assignment for organizational structure and
     * role-based permissions. Enables specialized administrative workflows
     * within specific organizational units while maintaining accountability
     * and access control boundaries.
     */
    department?: (string & tags.MaxLength<100>) | null | undefined;
  };

  /**
   * Complete authenticated administrator session response containing
   * comprehensive profile information, security tokens, and platform access
   * credentials for administrative dashboard and management system
   * integration.
   *
   * Administrator authorization establishes authenticated sessions with full
   * platform oversight capabilities including seller management workflows,
   * customer support resolution processes, product catalog auditing
   * functions, order monitoring systems, payment processing oversight,
   * inventory tracking management, dispute mediation capabilities, and
   * system-wide analytics access.
   *
   * Security implementation maintains comprehensive audit trails through
   * timestamp tracking while enabling extended administrative workflows
   * across the marketplace platform. Session continuity preserves operational
   * efficiency while maintaining security validation through token rotation
   * and comprehensive authentication logging for all administrative
   * activities.
   *
   * Response structure provides complete administrative profile data for
   * front-end permission management, operational scope determination, and
   * platform navigation control. Token information enables secure API access
   * with appropriate administrative privileges while maintaining session
   * security boundaries and expiration controls for comprehensive platform
   * management functionality.
   *
   * Administrator profiles include detailed privilege classifications,
   * department assignments, and operational status indicators necessary for
   * role-based access control implementation across all administrative
   * interfaces and backend processing systems within the shopping mall
   * marketplace ecosystem.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator. Primary key
     * from shopping_mall_admin table serving as immutable reference for all
     * administrative operations and audit trail establishment.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrative email address for secure authentication and platform
     * management access. Unique identifier for administrator accounts
     * following RFC 5322 email format standards with maximum 255 character
     * limit.
     */
    email: string & tags.MaxLength<255> & tags.Format<"email">;

    /**
     * Administrator first name for identification and professional
     * communication. Used in system notifications, audit trails, and
     * administrative interfaces for proper identification with 1-100
     * character length constraints.
     */
    first_name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Administrator last name for complete identification and authorization
     * records. Combined with first_name for full administrator
     * identification across platform management interfaces with 1-100
     * character length constraints.
     */
    last_name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Administrative privilege level determining access scope, operational
     * permissions, and system capabilities within the platform hierarchy
     * and role-based access control system.
     */
    admin_level:
      | "super_admin"
      | "department_admin"
      | "support_admin"
      | "viewer";

    /**
     * Administrative department assignment for organizational structure and
     * role-based permissions. Enables specialized administrative workflows
     * within specific organizational units while maintaining accountability
     * boundaries.
     */
    department?: (string & tags.MaxLength<100>) | null | undefined;

    /**
     * Super administrator status indicating highest platform privileges and
     * unrestricted access to all system functions, user management
     * capabilities, and platform-wide configuration controls with
     * comprehensive authority.
     */
    is_super_admin: boolean;

    /**
     * Account active status determining administrative access to platform
     * management functions. Controls operational permissions and system
     * access capabilities for security and administrative workflow
     * management.
     */
    is_active: boolean;

    /**
     * Account creation timestamp for administrative role assignment and
     * comprehensive audit trail establishment. Records account
     * establishment timing for security tracking, compliance purposes, and
     * system governance.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last account update timestamp for administrative changes and
     * permission modifications. Tracks configuration updates, profile
     * modifications, and access control changes for comprehensive audit
     * trail maintenance.
     */
    updated_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Account deactivation timestamp for administrative access revocation
     * and security management. Records account suspension or removal timing
     * for compliance tracking, security audit trails, and administrative
     * access control history.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Administrator authentication login request for secure access to shopping
   * mall platform management functions.
   *
   * Handles administrative credential validation with enhanced security
   * requirements appropriate for platform oversight operations. Supports
   * comprehensive audit trail generation through IP tracking, referrer
   * monitoring, and session context capture for administrative access logging
   * and security compliance.
   *
   * The authentication process validates administrator credentials against
   * the shopping_mall_admin table while maintaining security standards
   * suitable for administrative privileges. Upon successful authentication,
   * the system establishes an authenticated administrative session enabling
   * full platform management capabilities.
   *
   * Administrative sessions provide access to seller verification workflows,
   * customer support management, product catalog oversight, order monitoring,
   * payment processing review, inventory management, dispute resolution, and
   * comprehensive platform analytics across the entire marketplace
   * ecosystem.
   */
  export type ILogin = {
    /**
     * Administrative email address for secure authentication and platform
     * management access.
     *
     * Must correspond to an active administrative account in the
     * shopping_mall_admin table with is_active status set to true. Email
     * validation follows RFC 5322 standards and must match the exact email
     * stored in the administrative database.
     *
     * This email serves as the primary identifier for administrative access
     * control and is used for session establishment, audit logging, and
     * permission validation throughout the administrative dashboard and
     * management interfaces.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrative password for secure authentication with enhanced
     * security requirements.
     *
     * Password validation uses secure hashing against the password_hash
     * field in shopping_mall_admin table. Must meet administrative-level
     * security standards including complexity requirements, length
     * constraints, and historical password validation.
     *
     * Administrative passwords require enhanced security due to elevated
     * platform access permissions and are subject to additional validation
     * rules, session security checks, and audit trail requirements for
     * comprehensive administrative access management.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring
     * (OPTIONAL - server can extract, but client may provide for SSR).
     *
     * Used for administrative session security validation, geographical
     * access control, and comprehensive audit trail generation. IP tracking
     * helps identify suspicious access patterns, unauthorized login
     * attempts, and geographical anomalies in administrative access
     * patterns.
     *
     * When provided, enables enhanced security validation including IP
     * reputation checking, geographical consistency verification, and
     * detailed session origin tracking for administrative access compliance
     * and security incident investigation.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) - MANDATORY for session context
     * tracking.
     *
     * Captures the exact administrative interface URL from which the
     * authentication request originated. Used for session context
     * validation, administrative workflow tracking, and comprehensive audit
     * trail establishment.
     *
     * This URL enables proper session management, administrative interface
     * navigation tracking, and security validation by confirming the
     * authentication request originates from authorized administrative
     * interfaces within the shopping mall platform management system.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - MANDATORY for authentication flow
     * tracking.
     *
     * Documents the navigation path that led to the administrative login
     * interface, enabling comprehensive user journey tracking,
     * administrative workflow analysis, and security context validation for
     * administrative access patterns.
     *
     * Referrer tracking supports administrative access pattern analysis,
     * helps identify unauthorized access attempts through navigation
     * anomaly detection, and provides complete audit trail information for
     * administrative security compliance and incident investigation
     * requirements.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Administrative token refresh request enabling secure session extension
   * and continuous administrative access without repeated credential entry.
   *
   * Supports administrative workflow efficiency by allowing extended platform
   * management sessions while maintaining comprehensive security validation
   * appropriate for administrative privileges. The refresh operation
   * validates existing session tokens and generates new access credentials
   * with full administrative permissions.
   *
   * Token rotation maintains security through updated token issuance while
   * preserving session continuity for comprehensive platform oversight
   * operations including seller management, customer support resolution,
   * product catalog auditing, order monitoring, payment processing oversight,
   * inventory tracking, dispute mediation, and systemwide analytics access
   * across the entire marketplace ecosystem.
   */
  export type IRefresh = {
    /**
     * Current refresh token from the existing administrative session used
     * for secure token renewal and continuous administrative access
     * maintenance.
     *
     * This token must be a valid, unexpired refresh token previously issued
     * during successful administrative authentication. The refresh token
     * enables secure session extension without requiring password re-entry
     * while maintaining administrative security standards and comprehensive
     * audit trail requirements.
     *
     * Refresh tokens undergo comprehensive security validation including
     * token authenticity verification, expiration status checking, session
     * continuity validation, and administrative account status confirmation
     * to ensure only authorized administrators can extend their
     * authenticated sessions for continued platform management operations.
     */
    refresh_token: string;
  };

  /**
   * Administrative account summary representation for platform oversight and
   * operational management workflows within the shopping mall marketplace
   * ecosystem.
   *
   * This summary DTO provides essential administrator identification
   * information needed for audit trails, approval chains, and financial
   * oversight processes. Administrators handle critical platform operations
   * including seller verification, user management, content moderation,
   * dispute resolution, and system configuration while maintaining
   * appropriate access controls and comprehensive audit logging.
   *
   * The summary includes key administrative attributes such as role
   * classifications, department assignments, and account status indicators
   * that enable efficient workflow routing and permission management. This
   * controlled data exposure maintains security boundaries while providing
   * sufficient context for administrative collaboration and accountability
   * tracking across the entire marketplace platform.
   *
   * Used extensively in refund approval workflows, seller management
   * processes, and platform analytics dashboards where administrator
   * attribution and role-based visibility are essential for operational
   * transparency and compliance requirements.
   */
  export type ISummary = {
    /**
     * Primary Key - Factory Generated Identity from admin account system.
     * UUID format ensuring unique identification across all administrative
     * accounts with automatic generation upon account creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator display name used for system identification and
     * workflow management purposes. Concatenation of first_name and
     * last_name fields providing human-readable identification for
     * administrative interfaces and audit trails.
     */
    name: string;

    /**
     * Administrative email address for system access verification and
     * notification delivery. Must be unique across all administrator
     * accounts and validated against RFC 5322 email format standards for
     * secure authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrative privilege level including super admin, department
     * admin, or support admin for access control. Determines system
     * permissions, operational scope, and approval authority within the
     * administrative hierarchy.
     */
    admin_level: string;

    /**
     * Administrative department assignment for organizational structure and
     * role-based permissions. Optional field enabling departmental workflow
     * routing and specialized administrative function assignment.
     */
    department?: string | undefined;

    /**
     * Super administrator status indicating highest platform privileges and
     * unrestricted access. Controls access to system-critical functions,
     * global configuration changes, and emergency administrative
     * operations.
     */
    is_super_admin: boolean;

    /**
     * Account operational status determining administrative access and
     * system management capabilities. Controls login permissions, workflow
     * participation, and system notification eligibility for ongoing
     * administrative operations.
     */
    is_active: boolean;

    /**
     * Account creation timestamp for user management tracking and system
     * audit trail maintenance. ISO 8601 date-time format providing
     * chronological ordering for administrative account lifecycle
     * management.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last account update timestamp for administrative changes and
     * permission modifications. Tracks account maintenance activities, role
     * changes, and configuration updates for audit trail purposes.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Account deactivation timestamp for administrative access revocation
     * and security management. Soft deletion indicator maintaining
     * historical records while preventing system access and administrative
     * participation.
     */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
