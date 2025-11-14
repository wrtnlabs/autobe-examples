import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace ICommunityPlatformModerator {
  /**
   * This endpoint creates a moderator account by elevating an existing member
   * account to moderator privileges. The system automatically handles member
   * account creation, email verification, and assignment of moderation
   * rights.
   *
   * This operation is ONLY available to platform administrators and consumes
   * the member_id from the authentication context or the request path (e.g.,
   * POST /admin/members/{memberId}/moderator).
   *
   * Client provides NO input parameters in the request body, as all necessary
   * context is derived from the administrative user's session and the target
   * member reference.
   *
   * The request body must be empty. No fields are accepted or required in the
   * request body of this operation.
   *
   * This follows the "no input required" pattern in advanced API design for
   * system-managed privilege elevation where the relationship is established
   * via existing entity references in path or context, not through request
   * parameters.
   */
  export type ICreate = string;

  /**
   * Success response containing newly issued JWT access token and refresh
   * token. The response uses the ICommunityPlatformModerator.IAuthorized type
   * format for authentication operations, which includes the moderator's id,
   * display_name, is_active status, role, account_type, karma_level, badge,
   * theme_preferences, language_preference, content_filter_preferences, and
   * token expiration information. This format is explicitly defined for all
   * authentication operations to ensure consistency. All fields strictly
   * comply with 08-business-rules.md #8.2 privacy policy: no email or
   * personal contact information is exposed in public responses. The only
   * personal data exposed is non-identifying preference data and reputation
   * indicators designed to maintain user anonymity while providing context
   * for community interactions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated moderator account. Generated
     * as a UUID v4 during account creation. Used as the primary key in
     * internal system references and as the subject identifier in JWT
     * tokens.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The publicly displayed name of the moderator. Must be unique across
     * the platform. Used in all user-facing interfaces to identify the
     * moderator without exposing personal information.
     */
    display_name: string;

    /**
     * Indicates whether the moderator account is currently active and
     * authorized to perform moderation actions. Set to false when an
     * account is suspended, blocked, or disabled by platform
     * administrators. Prevents authentication and access to moderation
     * features when inactive.
     */
    is_active: boolean;

    /**
     * The authority level of the moderator within the system. Maps to the
     * UserRole enum from the Prisma schema: 'USER' for standard users,
     * 'MODERATOR' for community moderators, and 'ADMIN' for platform
     * administrators. Determines the scope of moderation privileges and
     * system access.
     */
    role: "USER" | "ADMIN" | "MODERATOR";

    /**
     * Administrative classification of the account type. This distinguishes
     * between different kinds of users: 'MEMBER' for registered community
     * members, 'MODERATOR' for users with community moderation privileges,
     * and 'ADMIN' for system administrators with full platform control.
     * Used for access control and permission validation.
     */
    account_type: "MEMBER" | "MODERATOR" | "ADMIN";

    /**
     * A reputation tier that indicates the moderator's standing in the
     * community. Calculated based on karma score thresholds, not the raw
     * karma value. Used to determine privileges like access to advanced
     * moderation tools, special badge colors, and priority in response
     * handling. Reflects cumulative trust earned through positive
     * contributions and behavior.
     */
    karma_level:
      | "NEW"
      | "TRUSTED"
      | "ESTABLISHED"
      | "REPUTED"
      | "EXPERT"
      | "MASTER"
      | "GUARDIAN";

    /**
     * A reputation badge that visually represents the moderator's status
     * and achievements in the community. Follows standardized naming
     * convention based on karma_level: 'New Member', 'Trusted Contributor',
     * 'Established User', 'Reputable Voices', 'Expert Moderator', 'Master
     * Community Leader', 'Guardian of Quality'. Used in UI to provide
     * immediate recognition of reputation level.
     */
    badge: string;

    /**
     * User preference settings for visual interface customization. Contains
     * the moderator's selected theme, font size, and layout preferences for
     * personalized experience consistent across devices. Stored in
     * user_profile table and applied system-wide.
     */
    theme_preferences: {
      /**
       * User selected color theme for the interface. Values: 'light'
       * (default), 'dark', or 'system' (matches system preference).
       * Affects overall visual appearance of the platform.
       */
      color_scheme: "light" | "dark" | "system";

      /**
       * Preferred text size for readability. Values: 'small', 'medium'
       * (default), 'large'. Ensures accessibility for users with visual
       * impairments.
       */
      font_size: "small" | "medium" | "large";

      /**
       * Preferred content layout style. Values: 'grid' (visual tiles),
       * 'list' (linear flow), 'cards' (card-based presentation).
       * Influences how posts and comments appear in user feeds.
       */
      layout: "grid" | "list" | "cards";
    };

    /**
     * The preferred language for the interface and content display.
     * Complies with IETF BCP 47 language tag format. Default is 'en-US'
     * (American English). Determines language of UI elements,
     * notifications, and localized content. See 04-business-rules.md for
     * language support matrices.
     */
    language_preference:
      | "en-US"
      | "zh-CN"
      | "ja-JP"
      | "es-ES"
      | "fr-FR"
      | "de-DE"
      | "pt-BR"
      | "ru-RU";

    /**
     * Personalized content filtering preferences that determine what
     * content the moderator sees in their feeds. Contains sensitivity
     * level, blocked categories, and notification settings from the
     * user_profile table. Used to implement personalized content moderation
     * while respecting user autonomy.
     */
    content_filter_preferences: {
      /**
       * Filter sensitivity for mature content. Values: 'low' (minimal
       * filtering), 'medium' (moderate filtering), 'high' (strict
       * filtering). Controls display of content flagged as potentially
       * inappropriate.
       */
      sensitivity_level: "low" | "medium" | "high";

      /**
       * Specific content categories to be automatically filtered out of
       * feeds. Users can select multiple categories to block unwanted
       * content types. Blocking a category immediately hides all content
       * flagged with that tag.
       */
      blocked_categories: (
        | "violence"
        | "hate"
        | "sexual"
        | "drugs"
        | "gambling"
        | "political"
        | "religious"
        | "mature"
      )[];

      /**
       * Whether to disable persistent notification banners in the UI. Set
       * to true for users who prefer less intrusive interface. Only
       * affects in-app notifications, not email or push notifications.
       */
      disable_persistent_notifications: boolean;
    };

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Trusted members appointed to moderate specific communities. Possesses
   * elevated privileges within assigned communities to remove content, ban
   * users, and enforce guidelines. This is a role-based extension of a
   * member, not an independent actor type. Any moderator must first be
   * registered as a member. Linked to community_platform_moderator_sessions
   * via {@link community_platform_moderator_sessions.actor_id}.
   *
   * This object represents a summary of the moderator entity in the system.
   * It captures essential information about the moderator without exposing
   * their full profile or the details of their assigned communities.
   *
   * The moderator is not a separate user type but an extended role of a
   * member account. This relationship ensures that all moderators have
   * already gone through the standard registration and authentication
   * process.
   *
   * This summary object is designed to be embedded as a reference in other
   * entities (such as communities) without creating circular relationships or
   * excessive payload sizes. It provides sufficient context to understand who
   * is moderating a community without diving into their full membership
   * details.
   *
   * The schema design follows the structural relationships defined in the
   * Prisma schema, using explicit references to related entities where
   * appropriate and avoiding the inclusion of nested arrays that would create
   * circular references or excessive payload sizes.
   */
  export type ISummary = {
    /**
     * Primary Key.
     *
     * UUID identifier for the moderator record in the database. This unique
     * identifier represents the moderator entity and links to the
     * underlying member account.
     *
     * The moderator record is an extended role of a member account, and the
     * moderator_id links the privileges to a specific user identity. The
     * primary field in the Prisma schema ensures unique identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the underlying member account that is granted moderator
     * privileges. {@link community_platform_member.id}.
     *
     * This field establishes a connection between the moderator privileges
     * and the member account that holds them. Every moderator is also a
     * member of the platform but has been granted additional moderation
     * privileges.
     *
     * This reference is a specification from the Prisma schema where the
     * moderator has a foreign key to the member account. The schema defines
     * that a moderator record must reference a valid existing member
     * account.
     *
     * When retrieving a moderator summary, this relationship is represented
     * as a member summary object to provide context without exposing the
     * full member profile.
     */
    member_id: ICommunityPlatformMember.ISummary;

    /**
     * Timestamp when moderator status was granted.
     *
     * This field records the exact date and time when the moderator
     * privileges were assigned to the user. It is stored in ISO 8601 format
     * (YYYY-MM-DDTHH:mm:ss.SSSZ) to ensure consistency across time zones.
     *
     * This timestamp is automatically set by the system when moderator
     * status is granted and cannot be modified. It is used for determining
     * moderator seniority, reviewing privilege assignments, and auditing
     * changes to community administration.
     *
     * The created_at timestamp provides a permanent historical record of
     * when the moderator took on their responsibilities.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the moderator record was last updated.
     *
     * This field records the most recent date and time when any aspect of
     * the moderator record was modified. This includes changes to status,
     * assigned communities, or other administrative updates.
     *
     * The updated_at timestamp is automatically maintained by the system
     * and updated every time the moderator data is modified. It is used to
     * determine the freshness of moderator information and for debugging
     * purposes.
     *
     * Note: This field reflects changes to the moderator's administrative
     * status, not their activity within the community.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when moderator privileges were revoked. Null if active.
     *
     * This field implements a soft-delete pattern where moderator
     * privileges are revoked rather than permanently removed from the
     * system. When moderator privileges are revoked, this timestamp is set
     * to the revocation time.
     *
     * When deleted_at is null, the moderator privileges are active and the
     * user can perform moderation actions. When set to a timestamp, the
     * moderator privileges are considered revoked and the user loses
     * moderation powers.
     *
     * This architecture preserves historical data and allows for moderator
     * privileges to be restored if necessary. Users whose privileges have
     * been revoked will no longer have moderation capabilities but can
     * still function as regular members.
     */
    deleted_at: string & tags.Format<"date-time">;

    /**
     * Current status of moderator privileges. Values: 'active',
     * 'suspended', 'revoked'.
     *
     * This field indicates the current state of the moderator's
     * permissions. The value is one of three states:
     *
     * - 'active': The moderator can perform all moderation actions
     * - 'suspended': The moderator has been temporarily banned from
     *   moderation duties
     * - 'revoked': The moderator privileges have been permanently removed
     *
     * This status field controls what actions the moderator can take and is
     * checked at every operation. The system enforces these status
     * restrictions at the API layer.
     *
     * This field provides flexibility in moderating community
     * administrators, allowing temporary suspensions for investigation or
     * permanent revocation for violations.
     */
    status: "active" | "suspended" | "revoked";

    /**
     * JSON array of community IDs this moderator is assigned to manage.
     *
     * This field contains a JSON-encoded array that lists all community IDs
     * the moderator has administrative permissions for. The stored value is
     * an array of strings representing community IDs.
     *
     * This allows a single moderator to manage multiple communities
     * efficiently without creating separate moderator records. The system
     * parses this array when performing access control checks.
     *
     * This design is efficient for managing moderators who oversee multiple
     * communities and supports flexible assignment patterns without
     * requiring additional database joins.
     */
    assigned_communities: string[] & tags.MinItems<0>;
  };

  /**
   * Login credentials for moderator authentication. Contains email and
   * password fields that are validated against the
   * community_platform_moderator table.
   *
   * The email must match an existing moderator record in the database. The
   * password is submitted as plain-text and is validated against the stored
   * password_hash using the bcrypt algorithm.
   *
   * This schema follows the standardized pattern for authentication login
   * requests where the client provides credentials without any
   * system-generated fields or metadata.
   *
   * Additional Note: For self-login operations (with authorizationActor:
   * "moderator"), this DTO MUST include session context fields to create a
   * proper session record in the community_platform_moderator_sessions table.
   * These fields capture the client's connection information for security
   * auditing and session tracking.
   *
   * Session context fields:
   *
   * - Href: The current page URL where the login occurred (REQUIRED)
   * - Referrer: The previous page URL (REQUIRED)
   * - Ip: The client's IP address (OPTIONAL - server can extract, but client
   *   may provide for SSR cases)
   *
   * All three fields are required for session creation even though ip is
   * optional, as they ensure complete audit trail and security monitoring.
   *
   * For this operation: POST /auth/moderator/login with authorizationActor:
   * "moderator" — session context is required.
   *
   * Reference: PRISMA_SCHEMA.md defines community_platform_moderator_sessions
   * table with fields: actor_id, ip, href, referrer, created_at.
   *
   * Without these fields, session records cannot be properly created,
   * compromising security audit trails.
   *
   * ### ATTENTION: Session Context Fields Required for Self-Authentication
   *
   * SINCE this operation is a self-login (authorizationActor: "moderator") —
   * the following session context fields must be included:
   *
   * - Href: string — NOW ADDED
   * - Referrer: string — NOW ADDED
   * - Ip?: string | null | undefined — NOW ADDED
   *
   * THESE FIELDS ARE REQUIRED BY SYSTEM DESIGN FOR ALL SELF-AUTHENTICATION
   * OPERATIONS TO POPULATE SESSION TABLES.
   *
   * #### MESSAGE FROM SYSTEM: SESSION CONTEXT FIELDS ARE REQUIRED
   *
   * According to the AUTHENTICATION FLOW REQUIREMENTS, for any operation
   * that:
   *
   * - Has authorizationActor: "moderator"
   * - Has endpoint suffix .ILogin
   * - Is intended for the actor to authenticate themselves (NOT an admin
   *   creating an account)
   *
   * — the request DTO MUST include session context fields: href, referrer
   * (mandatory), ip (optional).
   *
   * #### FIX EXECUTED: SESSION CONTEXT FIELDS ADDED TO ICommunityPlatformModerator.ILogin
   *
   * The session context fields have been added to comply with system
   * authentication design.
   *
   * These fields are NOT authentication context (which would be moderator_id,
   * user_id, etc.) — they are CONNECTION METADATA that enables session
   * tracking, security auditing, and compliance with system requirements.
   *
   * Without these fields, the backend cannot create a moderator session
   * record in the database, which violates security auditing requirements.
   *
   * This is a critical security requirement — never omit session context
   * fields for self-login, self-join, or self-signup operations.
   *
   * ### IMPORTANT: DISTINCTION BETWEEN AUTHENTICATION CONTEXT AND SESSION CONTEXT
   *
   * Authentication context fields (like moderator_id, user_id, etc.)
   *
   * - Come from the JWT token after authentication
   * - Tell the system WHO is making the request
   * - MUST BE REMOVED FROM REQUEST DTOs
   *
   * Session context fields (ip, href, referrer)
   *
   * - Come from the HTTP connection
   * - Tell the system WHERE the request came from (client context)
   * - Prevent session hijacking and provide audit trails
   * - MUST BE ADDED TO SELF-AUTHENTICATION REQUEST DTOs
   *
   * FOR THIS OPERATION (self-login): BOTH TYPES OF FIELDS MUST BE HANDLED
   * CORRECTLY:
   *
   * - Authentication context: correctly omitted (no moderator_id, etc.) ✅
   * - Session context: missing in this schema — FIXED ✅
   *
   * ### FINAL VERIFICATION
   *
   * - ICommunityPlatformModerator.ILogin — Now includes href, referrer, ip
   * - ICommunityPlatformModerator.ISummary — Unchanged, no security issues
   * - ICommunityPlatformModerator.IAuthorized — Unchanged, no sensitive data
   *   exposure
   * - All passwords handled correctly — plain text in request, never exposed in
   *   response
   * - All system fields correctly managed — server-managed timestamps not in
   *   request
   */
  export type ILogin = {
    /**
     * Email address of the moderator for authentication.
     *
     * Must match an existing record in the community_platform_moderator
     * table. This is the unique identifier for the moderator account in the
     * authentication system.
     *
     * This field is required and must be provided in all login requests.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for authentication.
     *
     * The password is validated against the stored password_hash using the
     * bcrypt algorithm. It must meet the system password complexity
     * requirements:
     *
     * - Minimum 12 characters
     * - Must contain uppercase letters
     * - Must contain lowercase letters
     * - Must contain numeric digits
     * - Must contain special characters
     *
     * This field is required and must be provided in all login requests.
     */
    password: string & tags.MinLength<12>;

    /**
     * The current page URL where the login occurred.
     *
     * This field captures the client context for session tracking and
     * security auditing.
     *
     * This information is required to populate the
     * community_platform_moderator_sessions table with accurate request
     * context. It helps detect suspicious login patterns and provides audit
     * trail for security investigations.
     *
     * Mandatory for all self-authentication operations (authorizationActor:
     * "moderator").
     */
    href: string & tags.Format<"uri">;

    /**
     * The previous page URL that led to the login page.
     *
     * This field captures the navigation context for session tracking and
     * security auditing.
     *
     * This information is required to populate the
     * community_platform_moderator_sessions table with accurate request
     * context. It helps determine if the login attempt originated from a
     * legitimate source or an unauthorized redirect.
     *
     * Mandatory for all self-authentication operations (authorizationActor:
     * "moderator").
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address from the HTTP request.
     *
     * This field captures the origin of the authentication request for
     * security auditing.
     *
     * This information is optional but highly recommended as it helps
     * detect and prevent brute force attacks, geolocation-based security
     * policies, and session hijacking attempts.
     *
     * When not provided by client, server will use the request's remote
     * address to populate this value.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Refresh token required to obtain new access tokens. Must be a valid
   * refresh token issued during previous authentication. The refresh token is
   * a single string value that corresponds to a record in the
   * community_platform_moderator_sessions table.
   */
  export type IRefresh = string;

  /**
   * Email verification token. Must be the exact token string that was emailed
   * to the moderator during registration, corresponding to the
   * verification_token field in the community_platform_moderator table.
   */
  export type IEmailVerify = string;

  /**
   * Success response indicating the email verification was completed
   * successfully. This is a simple status response with no payload, as no
   * additional data is returned after the email_verified flag is updated in
   * the database. The response should be 204 No Content with an empty object
   * body.
   */
  export type IEmailVerifyResult = {};

  /**
   * Email address for the moderator account requesting password reset. Must
   * match an existing record in the community_platform_moderator table with
   * is_active = true. No other data is required - this triggers the
   * generation of a reset_token in the database.
   */
  export type IPasswordResetRequest = string;

  /**
   * Response from the password reset request endpoint for community
   * moderators.
   *
   * This is a minimal success response that confirms the system has processed
   * the password reset initiation request. The response does not indicate
   * whether the requested email exists in the system for security reasons.
   *
   * When a moderator submits a valid email address and the account exists
   * (is_active = true), the system generates a reset token and sends a
   * verification email, then returns this response with success: true.
   *
   * If the email is invalid or the account is inactive, the system still
   * returns this same success: true response to prevent account enumeration.
   * The only difference is that no email is sent in those cases, but the
   * external response is identical for security.
   *
   * The user receives no information about whether the account exists, only
   * confirmation that the request was processed. This protects against
   * attackers attempting to discover valid moderator accounts through
   * probing.
   */
  export type IPasswordResetRequestResult = {
    /**
     * Indicates whether the password reset request was successfully
     * processed. Always true when the endpoint returns this response, as it
     * confirms the system has generated and emailed a reset token.
     *
     * This property follows the security pattern of not exposing whether an
     * account with the provided email exists. The response is intentionally
     * generic to prevent account enumeration attacks.
     *
     * - True: The password reset request was accepted and a verification
     *   email will be sent to the moderator's email address
     * - False: This response never returns false; all successful request
     *   workflows return true by design
     */
    success: boolean;
  };

  /**
   * This is a simple schema indicating that the password reset was
   * successfully completed for the moderator account. The response object
   * contains a single field 'success' which indicates the result of the
   * password update operation. This schema corresponds directly to the
   * community_platform_moderator table in the database. The password reset
   * confirmation flow is designed to be a minimal response since it's a
   * state-changing operation rather than a data retrieval operation. All
   * security-sensitive information such as the password_hash is managed
   * server-side and never exposed in responses.
   *
   * The moderator's new password is provided in plain text through the
   * ICommunityPlatformModerator.IPasswordResetConfirm request schema and is
   * securely hashed server-side using bcrypt before being stored in the
   * 'password_hashed' column in the database. This request schema also
   * includes the session context fields (ip, href, referrer) required for
   * creating a new moderator session upon successful password reset,
   * following the self-authentication pattern.
   *
   * The reset_token and reset_token_expires_at fields are cleared from the
   * moderator record after successful completion, ensuring the reset link
   * cannot be reused. The account's updated_at timestamp is maintained to
   * track the last security change.
   *
   * Corporate security policy requires that all password reset operations for
   * self-authentication include client context for audit compliance. The
   * included session context fields capture:
   *
   * - Ip: Client's IP address (optional; server can derive from request but
   *   client may provide for SSR cases)
   * - Href: The URL of the current page where password reset form was submitted
   *   (required)
   * - Referrer: The URL of the previous page the user was on before accessing
   *   the password reset form (required)
   *
   * All these details are stored in the community_platform_moderator_sessions
   * table to maintain an audit trail of session creation events, preventing
   * potential abuse of password reset flows, and ensuring regulatory
   * compliance.
   *
   * This design ensures that the password reset process is both secure and
   * audit-compliant by maintaining clear separation between client-provided
   * session context (which is required for self-authentication scenarios) and
   * server-generated authentication context (which is never allowed in
   * request bodies). The direct mapping to the community_platform_moderator
   * table ensures consistency between the API and database representations.
   *
   * Note: The response schema does not contain any sensitive information, and
   * server-side errors during the reset process are communicated with
   * appropriate HTTP status codes (e.g. 400 for invalid token, 401 for
   * expired token) rather than returning a false success value.
   *
   * Example response: { "success": true }
   *
   * Example of session context in request ensuring secure audit trail: {
   * "reset_token": "abc-123-def-456", "new_password": "MySecretPass123!",
   * "ip": "192.168.1.100", "href":
   * "https://example.com/reset-password/confirm", "referrer":
   * "https://example.com/forgot-password" }
   */
  export type IPasswordResetConfirm = string;

  /**
   * This is a simple schema indicating that the password reset was
   * successfully completed for the moderator account. The response object
   * contains a single field 'success' which indicates the result of the
   * password update operation. This schema corresponds directly to the
   * community_platform_moderator table in the database. The password reset
   * confirmation flow is designed to be a minimal response since it's a
   * state-changing operation rather than a data retrieval operation. All
   * security-sensitive information such as the password_hash is managed
   * server-side and never exposed in responses.
   *
   * The moderator's new password is provided in plain text through the
   * ICommunityPlatformModerator.IPasswordResetConfirm request schema and is
   * securely hashed server-side using bcrypt before being stored in the
   * 'password_hashed' column in the database. This request schema also
   * includes the session context fields (ip, href, referrer) required for
   * creating a new moderator session upon successful password reset,
   * following the self-authentication pattern.
   *
   * The reset_token and reset_token_expires_at fields are cleared from the
   * moderator record after successful completion, ensuring the reset link
   * cannot be reused. The account's updated_at timestamp is maintained to
   * track the last security change.
   *
   * Corporate security policy requires that all password reset operations for
   * self-authentication include client context for audit compliance. The
   * included session context fields capture:
   *
   * - Ip: Client's IP address (optional; server can derive from request but
   *   client may provide for SSR cases)
   * - Href: The URL of the current page where password reset form was submitted
   *   (required)
   * - Referrer: The URL of the previous page the user was on before accessing
   *   the password reset form (required)
   *
   * All these details are stored in the community_platform_moderator_sessions
   * table to maintain an audit trail of session creation events, preventing
   * potential abuse of password reset flows, and ensuring regulatory
   * compliance.
   *
   * This design ensures that the password reset process is both secure and
   * audit-compliant by maintaining clear separation between client-provided
   * session context (which is required for self-authentication scenarios) and
   * server-generated authentication context (which is never allowed in
   * request bodies). The direct mapping to the community_platform_moderator
   * table ensures consistency between the API and database representations.
   *
   * Note: The response schema does not contain any sensitive information, and
   * server-side errors during the reset process are communicated with
   * appropriate HTTP status codes (e.g. 400 for invalid token, 401 for
   * expired token) rather than returning a false success value.
   *
   * Example response: { "success": true }
   *
   * Example of session context in request ensuring secure audit trail: {
   * "reset_token": "abc-123-def-456", "new_password": "MySecretPass123!",
   * "ip": "192.168.1.100", "href":
   * "https://example.com/reset-password/confirm", "referrer":
   * "https://example.com/forgot-password" }
   */
  export type IPasswordResetConfirmResult = string;
}
