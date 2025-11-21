import { tags } from "typia";

import { ISecurityContext } from "./ISecurityContext";
import { IQrCodeData } from "./IQrCodeData";
import { IBackupCodes } from "./IBackupCodes";

export namespace IShoppingMallAuthentication {
  /**
   * Multi-factor authentication enablement request containing authentication
   * preferences and security validation. This request initiates the MFA
   * enrollment process by specifying the preferred authentication method and
   * providing necessary security context for the setup process.
   *
   * The request includes information about the desired MFA method (TOTP, SMS,
   * or email), optional setup preferences, and security context to validate
   * the authenticity of the enrollment request. The system verifies customer
   * authentication status and session validity before proceeding with MFA
   * configuration.
   */
  export type IEnableMfa = {
    /**
     * Preferred multi-factor authentication method type for setup. TOTP
     * provides time-based one-time passwords, SMS sends codes via text
     * message, and email sends codes to the registered email address.
     */
    mfa_type: "totp" | "sms" | "email";

    /**
     * Alternative email address for backup MFA delivery when primary method
     * is unavailable. Must be a valid email format different from the
     * account's primary email address. Used for authentication method
     * redundancy and account recovery.
     */
    backup_email?: (string & tags.Format<"email">) | undefined;

    /**
     * Backup phone number for MFA delivery in E.164 format (e.g.,
     * +1234567890). Required when SMS is the primary method or for backup
     * authentication. Used for security code delivery and account
     * recovery.
     */
    backup_phone?:
      | (string & tags.Pattern<"^\\+[1-9]\\d{1,14}$"> & tags.Format<"regex">)
      | undefined;

    /**
     * Security context validation including session information and device
     * fingerprinting. Contains validation data to ensure the MFA setup
     * request originates from a legitimate authenticated session and
     * trusted device context.
     */
    security_context?: ISecurityContext | undefined;

    /**
     * Client IP address for session tracking and security context
     * validation during MFA operations. Used for audit logging and to
     * detect suspicious setup attempts from unusual locations or devices.
     * The IP address is extracted from the request context if not
     * provided.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * Connection URL (current page URL) for session tracking and security
     * context during MFA setup operations. Provides context about the
     * environment where MFA setup was initiated for audit and support
     * purposes.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) for session tracking and security
     * context validation during MFA setup. Helps identify the navigation
     * path that led to MFA setup initiation for security monitoring and
     * user experience optimization.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Multi-factor authentication setup response containing configuration
   * details and setup instructions for the customer. This response provides
   * all necessary information to complete MFA enrollment including QR codes,
   * backup codes, and step-by-step setup guidance.
   *
   * The response includes configuration details such as the authentication
   * method type, secret keys for TOTP applications, QR code data for easy
   * scanning, and backup codes for account recovery. Setup instructions guide
   * customers through the enrollment process with clear steps and security
   * best practices.
   */
  export type IMfaSetupResponse = {
    /**
     * QR code data reference pointing to base64-encoded image containing
     * TOTP configuration for authenticator app setup
     */
    qr_code_data?: IQrCodeData | undefined;

    /**
     * Backup authentication codes reference providing account recovery
     * options when primary MFA method is unavailable
     */
    backup_codes: IBackupCodes;

    /**
     * Indicates whether immediate verification of the MFA setup is required
     * before the method becomes active. When true, customers must complete
     * a verification challenge to confirm successful configuration,
     * ensuring proper authentication method functionality before relying on
     * it for account access.
     */
    verification_required: boolean;

    /**
     * Type of multi-factor authentication method configured (e.g., 'totp',
     * 'sms', 'email')
     */
    mfa_type: "totp" | "sms" | "email";

    /**
     * Secret key for TOTP authentication setup in authenticator
     * applications. This 32-character base32 encoded string should be
     * entered manually or via QR code into the customer's authenticator app
     * to enable time-based one-time password generation.
     */
    secret_key?: (string & tags.MinLength<32> & tags.MaxLength<32>) | undefined;

    /**
     * Step-by-step instructions for completing the multi-factor
     * authentication setup process. Includes guidance on installing
     * authenticator apps, scanning QR codes, and testing the setup to
     * ensure proper configuration for enhanced account security.
     */
    setup_instructions: string;
  };

  /**
   * Multi-factor authentication update request containing security
   * confirmation and credential validation for MFA management operations.
   * This request handles both enablement and disablement of multi-factor
   * authentication methods while maintaining comprehensive security
   * validation throughout the process.
   *
   * Security requirements include enhanced validation procedures requiring
   * current password confirmation, recent activity verification, session
   * validation checks, and potential re-authentication confirmation before
   * MFA changes. The system validates requesting customer authentication
   * strength with complete session validity verification, creating
   * comprehensive audit logs documenting all security configuration changes
   * through the customer session management system.
   */
  export type IUpdateMfa = {
    /**
     * MFA management action to perform. 'disable' deactivates existing MFA
     * configuration, 'verify' confirms successful setup completion,
     * 'regenerate' creates new backup codes, 'remove' removes a specific
     * authentication method.
     */
    action: "disable" | "verify" | "regenerate" | "remove";

    /**
     * Current account password for security verification during MFA
     * disablement. Required when disabling MFA to prevent unauthorized
     * security downgrades. The password is validated against the current
     * authentication credentials before processing the MFA change request.
     */
    current_password?: (string & tags.Format<"password">) | undefined;

    /**
     * Single backup authentication code used for verification when
     * disabling MFA without the primary authentication method. Provides
     * emergency access validation when the primary MFA method is
     * unavailable.
     */
    backup_code?: (string & tags.MinLength<8> & tags.MaxLength<8>) | undefined;

    /**
     * Current verification code from the multi-factor authentication method
     * for setup confirmation or method removal verification. Required to
     * prove possession of the authentication device during sensitive
     * operations.
     */
    verification_code?: (string & tags.Pattern<"^[0-9]{6}$">) | undefined;

    /**
     * Specific multi-factor authentication method type to remove when
     * action is 'remove'. Allows selective removal of individual
     * authentication methods while preserving others.
     */
    mfa_type_to_remove?: "totp" | "sms" | "email" | undefined;

    /**
     * Optional explanatory reason for multi-factor authentication changes,
     * used for audit logging and security monitoring. Helps identify
     * legitimate user actions versus potential security incidents.
     */
    reason?: (string & tags.MaxLength<500>) | undefined;
  };

  /**
   * Response confirming successful two-factor authentication disablement for
   * customer accounts in the shopping mall platform.
   *
   * This response documents the completion of sensitive security
   * configuration changes with comprehensive audit trail information and user
   * notification details. The response structure supports both
   * customer-facing confirmation and backend security monitoring systems.
   *
   * Response components include operation success status, detailed messaging
   * for user communication, and timestamp information for security audit
   * integration. The timestamp field enables chronological tracking of all
   * MFA configuration changes across the platform.
   *
   * Integration capabilities support security information systems, customer
   * notification services, and compliance reporting requirements. The
   * response format ensures consistent handling of MFA disablement operations
   * across all customer authentication interfaces and administrative
   * oversight systems.
   *
   * Used in customer-facing MFA disablement endpoints to provide immediate
   * feedback about security configuration changes while maintaining
   * comprehensive security oversight and regulatory compliance documentation
   * requirements.
   */
  export type IMfaDisableResponse = {
    /**
     * Operation success indicator for MFA disablement confirmation.
     * Indicates whether the two-factor authentication disablement completed
     * successfully without security validation errors. Used for immediate
     * client-side feedback and downstream system integration decisions.
     */
    success: boolean;

    /**
     * Detailed status message explaining the MFA disablement result and
     * security implications. Provides user-friendly explanation about the
     * deactivation process completion, confirmation of security
     * notifications sent, and guidance for future account security
     * management. Supports multi-language messaging capabilities for
     * international customer bases.
     */
    message: string;

    /**
     * Operation completion timestamp in ISO 8601 format. Used for security
     * audit logging, regulatory compliance tracking, and chronological
     * integration with external security information systems. Enables
     * precise temporal correlation of MFA configuration changes with other
     * security events and user activities.
     */
    timestamp: string & tags.Format<"date-time">;
  };

  /**
   * Multi-factor authentication disablement request for customer security
   * configuration management in the shopping mall platform.
   *
   * This request type handles the sensitive operation of removing two-factor
   * authentication protection from customer accounts. The disablement process
   * requires comprehensive security validation including current password
   * verification and mandatory session context tracking to prevent
   * unauthorized security downgrades.
   *
   * Security requirements enforce multi-step verification procedures where
   * customers must provide current authentication credentials and complete
   * session validation checks. The system validates authentication strength,
   * recent activity patterns, and session integrity before processing MFA
   * removal requests.
   *
   * Request validation includes mandatory href and referrer tracking for
   * security audit logging, with optional IP address and confirmation code
   * fields supporting enhanced security monitoring. The reason field enables
   * security education opportunities and legitimate use case identification.
   *
   * Used exclusively in customer-facing MFA disablement endpoints where
   * authenticated customers request removal of their multi-factor
   * authentication configuration while maintaining comprehensive security
   * oversight and audit trail documentation.
   */
  export type IDisableMfa = {
    /**
     * Current account password for primary authentication verification
     * during MFA disablement operations. Required to prove legitimate
     * account ownership before allowing sensitive security configuration
     * changes. Must match the current authentication credentials stored in
     * the customer account system.
     */
    password: string & tags.Format<"password">;

    /**
     * One-time confirmation code received through registered communication
     * channels (email or SMS). Used as additional security verification
     * when primary MFA method is unavailable or as enhanced validation for
     * sensitive security operations. Optional but recommended for
     * high-security accounts.
     */
    confirmation_code?: string | undefined;

    /**
     * Optional explanatory reason for disabling two-factor authentication.
     * Helps platform security teams understand user preferences and
     * identify legitimate disablement scenarios. Common reasons include
     * device loss, accessibility needs, or temporary convenience
     * requirements. Supports security education and user experience
     * improvement initiatives.
     */
    reason?: string | undefined;

    /**
     * Client IP address for session tracking and security monitoring.
     * Optional field that can be provided by client applications for
     * enhanced security logging and fraud detection. Server automatically
     * extracts IP address from request headers when not provided, ensuring
     * comprehensive audit trail documentation.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) - MANDATORY field for session
     * tracking and security audit logs. Required to document the complete
     * security operation context including page navigation history. Must be
     * a valid URI representing the current application location where the
     * MFA disablement request originates.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - MANDATORY field for session
     * tracking and traffic source analysis. Used to document the complete
     * security operation context and understand user navigation patterns
     * during sensitive account configuration changes. Must be a valid URI
     * representing the previous page location.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authentication token pair response issued after successful token refresh
   * operation, providing new access token for immediate use within the
   * shopping mall platform.
   *
   * This response structure delivers the essential authentication credentials
   * needed for continued platform access while maintaining security through
   * JWT token-based session management. The token renewal process ensures
   * seamless user experience without requiring re-authentication while
   * implementing rotation mechanisms to enhance security posture.
   *
   * Note: refresh_token is handled via secure HTTP-only cookies and not
   * exposed in response body for enhanced security protection against token
   * interception and cross-site scripting vulnerabilities.
   */
  export type ITokenResponse = {
    /**
     * New JWT access token providing authenticated session continuity
     * across the shopping mall platform. Contains updated expiration timing
     * and refreshed security signatures for enhanced session management and
     * protection against token replay attacks.
     */
    access_token: string;

    /**
     * Access token validity duration in seconds before requiring renewal
     * through refresh token operation or re-authentication. Used for
     * client-side token expiration management with typical values ranging
     * from 900 (15 minutes) to 3600 (1 hour) for security-conscious
     * implementations.
     */
    expires_in: number & tags.Type<"int32">;

    /**
     * Authentication token type specification, confirming 'Bearer' protocol
     * for HTTP header formatting and client-side request preparation in
     * accordance with OAuth 2.0 authorization framework standards.
     */
    token_type: string;
  };
}
