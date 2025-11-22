import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalDiscussionContentModerator {
  /**
   * Content moderator registration request structure for creating new
   * moderator accounts with elevated permissions.
   *
   * Contains all necessary information for establishing a new content
   * moderator account including authentication credentials, profile details,
   * and session context information. This schema supports the platform's
   * moderator onboarding process while maintaining security requirements and
   * proper account setup.
   *
   * Session context fields (ip, href, referrer) are included to establish
   * proper security monitoring and session tracking for moderator account
   * creation. The registration process creates a new moderator with default
   * 'active' status and appropriate permissions for content management
   * functions.
   *
   * Used in moderator account creation operations, supporting secure
   * onboarding of qualified content moderators with proper authorization and
   * account setup procedures.
   */
  export type ICreate = {
    /**
     * Content moderator's display name for identification and attribution.
     * Will be used across the platform for moderator actions and community
     * interactions.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Content moderator's email address for account management and secure
     * authentication. Must be unique and will receive account verification
     * notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Content moderator account password meeting platform security
     * requirements. Must contain uppercase, lowercase, numbers, and special
     * characters for enhanced account protection.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /**
     * Optional moderator biography describing expertise, background, or
     * moderation approach. Provides context for community trust and user
     * interactions.
     */
    bio?: string | null | undefined;

    /**
     * Optional profile picture URL for moderator identification. Will be
     * used across the platform for visual recognition of moderation
     * actions.
     */
    avatar_url?: string | null | undefined;

    /**
     * Client IP address for session tracking and security monitoring.
     * Server can extract automatically, but client may provide for SSR
     * scenarios.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * Connection URL (current page URL) where the moderator registration
     * occurred. Used for session context tracking and security audit
     * trails.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) leading to the registration page.
     * Provides context for how the moderator discovered and accessed the
     * platform.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authenticated content moderator response with JWT tokens and session
   * information.
   *
   * This schema represents the complete authentication response for content
   * moderators after successful login or token refresh. It contains the
   * moderator's identity information, security tokens, and session context
   * needed for subsequent API interactions.
   *
   * The authorized response provides access credentials for content
   * moderation functions including content oversight, community management,
   * user interaction monitoring, and administrative controls throughout the
   * discussion board platform. This response establishes the moderator's
   * authenticated session with appropriate permissions and role context.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated content moderator account.
     * This UUID serves as the primary identifier for the moderator within
     * the system and is used for authorization checks, audit trails, and
     * moderator-specific operations throughout the platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Content moderator's display name used for identification and
     * attribution across the discussion platform. Appears with moderation
     * actions and system notifications.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Email address of the authenticated content moderator. This is the
     * same email used during login and serves as the moderator's account
     * identifier for communication and system notifications related to
     * moderation activities.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional moderator biography describing expertise, background, or
     * moderation approach. Provides context for community trust and user
     * understanding.
     */
    bio?: (string & tags.MaxLength<500>) | null | undefined;

    /**
     * Optional profile picture URL for moderator identification in
     * discussions and moderation dashboards. Supports visual recognition of
     * moderation actions.
     */
    avatar_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Content moderator account status indicating current operational
     * state: 'active' for full moderation access, 'suspended' for temporary
     * restrictions, or 'inactive' for dormant accounts.
     */
    status: string;

    /**
     * Timestamp when this moderator account was originally created. Used
     * for audit trails and account lifecycle tracking.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this moderator profile was last updated. Reflects
     * latest changes to account information or settings.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft delete timestamp for deactivated moderator accounts. Present
     * only for deleted accounts, null for active or suspended moderators.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Content moderator login credentials for authentication in the economic
   * and political discussion board system.
   *
   * This schema represents the required authentication information for
   * content moderators to access the platform's moderation dashboard and
   * content management tools. The login process validates moderator
   * credentials against stored account information and establishes a secure
   * session with JWT token generation for subsequent API calls.
   *
   * Moderators use this credential type to authenticate for content
   * oversight, community management, and administrative functions throughout
   * the discussion board platform. Failed authentication attempts are tracked
   * for security monitoring and rate-limiting protection.
   */
  export type ILogin = {
    /**
     * Content moderator email address used for account authentication. Must
     * be a valid email address that matches the registered moderator
     * account in the system. This email serves as the primary identifier
     * for moderator authentication and is validated against the stored
     * account information.
     */
    email: string & tags.Format<"email">;

    /**
     * Content moderator password for account authentication. Must match the
     * stored password hash for the specified email address. Password is
     * transmitted in plain text during login and validated against the
     * secure hash stored in the database. Password should meet security
     * requirements for moderator account access.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring.
     * Optional field that provides additional context for session creation
     * and audit trail maintenance. When provided, helps with geographic
     * session tracking and security analysis. Server can extract this
     * information automatically if not provided by the client.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) for session context and audit
     * trail. Mandatory field that provides the URL of the page from which
     * the login request originates. This information is essential for
     * session tracking, user experience analysis, and security monitoring
     * purposes.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) for session context and audit trail.
     * Mandatory field that provides the URL of the page that referred to
     * the login page. This information helps track user navigation patterns
     * and supports security analysis for session creation context.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Refresh token request for session renewal in the content moderation
   * system.
   *
   * This schema enables content moderators to extend their authenticated
   * session without requiring re-authentication. The refresh mechanism
   * validates the provided refresh token against stored session data and
   * generates new access tokens with extended expiration periods.
   *
   * Moderators use this token refresh process to maintain continuous access
   * to content management tools, moderation dashboard, and administrative
   * functions during extended work sessions. Security protocols ensure
   * refresh tokens are single-use with automatic rotation upon successful
   * renewal.
   */
  export type IRefresh = {
    /**
     * Valid refresh token for session renewal. Must be a valid, non-expired
     * refresh token that was issued during the initial authentication
     * process. This token is used to validate the moderator's continued
     * access rights and generate new access tokens with extended session
     * lifetime.
     */
    refreshToken: string;
  };

  /**
   * Password reset request for content moderator accounts.
   *
   * Used to initiate password recovery for content moderator accounts when
   * access is forgotten or compromised. This request type enables secure
   * password restoration through email verification by sending time-limited
   * reset tokens to the registered content moderator email address.
   *
   * The request contains minimal required information to validate moderator
   * account existence and trigger the password reset workflow. Reset tokens
   * are cryptographically generated with secure randomness and expire after
   * 24 hours for security. This process ensures moderator account integrity
   * while providing essential account recovery capabilities.
   *
   * Content moderators use this type to request password resets when they
   * cannot access their accounts due to forgotten credentials or suspected
   * compromise.
   */
  export type IResetPassword = {
    /**
     * Content moderator email address used for password reset verification.
     *
     * Must match the registered email address in the
     * econ_political_discussion_users table for the content moderator
     * account. This email will receive the password reset token and
     * instructions for account recovery.
     *
     * Email validation ensures password reset requests can only be
     * initiated for existing moderator accounts. The system validates email
     * existence before generating reset tokens to prevent unnecessary token
     * generation for non-existent accounts.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Password reset confirmation response for content moderator accounts.
   *
   * Returned after successful password reset request initiation for content
   * moderator accounts. This response confirms the reset process has been
   * started and provides next steps for the moderator to complete password
   * restoration.
   *
   * The response includes confirmation that reset tokens have been generated
   * and instructions for accessing password reset emails. It guides content
   * moderators through the secure password restoration process, ensuring they
   * understand the next steps required to set new passwords.
   *
   * Content moderators receive this confirmation after password reset
   * requests and use the information to complete their account recovery
   * through email-based token validation.
   */
  export type IPasswordResetResponse = {
    /**
     * Password reset confirmation message for content moderator.
     *
     * Provides clear confirmation that the password reset request has been
     * processed successfully. This message informs the moderator that
     * password reset instructions have been sent to their registered email
     * address.
     *
     * The confirmation message is designed to reassure content moderators
     * that their password reset request was successful and provide clear
     * next steps. It may include specific timing information for email
     * delivery and token expiration.
     *
     * Content moderators rely on this message to understand that their
     * password reset request was successful and that they should check
     * their email for reset instructions.
     */
    message: string;

    /**
     * Next steps instructions for content moderator password reset.
     *
     * Provides detailed guidance on the password reset process completion
     * steps. This includes information about email timing, token usage, and
     * password setting requirements.
     *
     * The next steps typically include instructions to check email for
     * reset tokens, token expiration timing (24 hours), and password
     * complexity requirements (8+ characters, mixed case, numbers, special
     * characters) for setting new passwords.
     *
     * Content moderators use these instructions to successfully complete
     * their password reset process and restore access to their moderator
     * accounts.
     */
    next_steps: string;

    /**
     * Indicates whether password reset email was successfully sent.
     *
     * Boolean flag confirming that the password reset email with token was
     * successfully generated and sent to the content moderator's registered
     * email address.
     *
     * This field provides explicit confirmation of email delivery status,
     * allowing content moderators to understand whether they should expect
     * password reset instructions in their email. If false, it may indicate
     * an email delivery issue requiring support intervention.
     *
     * Content moderators can rely on this flag to verify email delivery
     * status and take appropriate action if email delivery failed.
     */
    email_sent: boolean;
  };
}
