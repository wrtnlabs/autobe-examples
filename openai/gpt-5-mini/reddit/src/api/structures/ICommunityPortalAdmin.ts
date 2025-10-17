import { tags } from "typia";

import { ICommunityPortalUser } from "./ICommunityPortalUser";
import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPortalAdmin {
  /**
   * Payload to create a new admin account.
   *
   * This DTO is used by the administrative onboarding flow to create the
   * authentication identity (community_portal_users) and the corresponding
   * admin metadata (community_portal_admins). Client-supplied fields include
   * the user identity and credential (username, email, password) plus
   * optional profile and admin-scoped attributes.
   *
   * Important rules and notes:
   *
   * - The server MUST hash and salt the plaintext password and persist only the
   *   derived password_hash into the community_portal_users table. The
   *   plaintext password MUST NOT be stored or echoed back.
   * - Required fields: username, email, password. Optional fields may be
   *   provided to set display name, initial admin level, and activation
   *   flag.
   * - This DTO intentionally does not include server-managed fields such as id,
   *   user_id, created_at, updated_at, or deleted_at; those are assigned by
   *   the server upon creation.
   *
   * Security guidance: Transmit this payload only over TLS. The server MUST
   * enforce uniqueness constraints for username and email and return 409
   * Conflict for duplicates. Audit creation actions in moderation/admin
   * logs.
   */
  export type ICreate = {
    /**
     * Chosen unique login handle for the admin account. This maps to
     * community_portal_users.username in the Prisma schema and must be
     * unique across users.
     */
    username: string;

    /**
     * Primary email address for the admin account. This maps to
     * community_portal_users.email in the Prisma schema and is used for
     * verification and notifications. Implementations SHOULD validate
     * uniqueness and syntactic correctness.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the client. The server MUST hash and
     * salt this value before persisting into
     * community_portal_users.password_hash. The plaintext password MUST NOT
     * be stored or echoed back in responses.
     */
    password: string;

    /**
     * Optional human-friendly display name shown in UIs. Corresponds to
     * community_portal_users.display_name. May be null if the admin prefers
     * not to set a display name.
     */
    displayName?: string | null | undefined;

    /**
     * Optional admin role or level string such as 'super' or
     * 'moderator_coordinator'. This maps conceptually to
     * community_portal_admins.admin_level in the Prisma schema. The server
     * should validate allowed values per platform policy.
     */
    adminLevel?: string | undefined;

    /**
     * Optional flag indicating whether the admin account should be active
     * immediately. If omitted, the server applies platform default
     * (typically true for provisioning flows controlled by administrators).
     * This maps to community_portal_admins.is_active semantics.
     */
    isActive?: boolean | undefined;
  };

  /**
   * Authorization response for an admin account.
   *
   * This DTO is returned after successful admin authentication or token
   * refresh. It bundles a lightweight admin summary and the public user
   * profile for convenience, together with the authorization token payload
   * required for authenticated API calls. The structure intentionally avoids
   * exposing any secrets (for example, password_hash) and provides only
   * public, display-safe fields.
   *
   * The admin and user sub-objects map to the underlying Prisma models (see
   * their respective schemas). This DTO itself is a transport container and
   * does not directly map every property to a single Prisma model.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated admin user. This value
     * corresponds to the user's primary id and is used to correlate the
     * authorization token with the admin identity.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Summary information for the admin account.
     *
     * This object contains stable, non-sensitive admin metadata drawn from
     * the platform's admin record. It is intended to provide the client
     * with the minimal admin context required for UI rendering and audit
     * tracing.
     */
    admin: ICommunityPortalAdmin.ISummary;

    /**
     * Public user profile associated with the admin account.
     *
     * Includes safe, public-facing user attributes (username, display name,
     * avatar, karma) that frontends can display alongside admin actions
     * without exposing authentication secrets.
     */
    user: ICommunityPortalUser.ISummary;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login request payload for admin authentication.
   *
   * Clients submit this object to POST /auth/admin/login to obtain an
   * ICommunityPortalAdmin.IAuthorized response on success. The payload
   * intentionally contains only the credential fields required for
   * authentication and excludes any server-managed or derived properties.
   */
  export type ILogin = {
    /**
     * Login identifier used to authenticate the admin account.
     *
     * Accepts either the account email address or the username. The server
     * will resolve the identifier to a community_portal_users record during
     * authentication. Clients should prefer email for clarity, but username
     * is supported for convenience.
     */
    identifier: string;

    /**
     * Plain-text password supplied by the user for authentication.
     *
     * The server WILL hash and verify this password against the stored
     * password_hash; clients MUST transmit this value only over TLS. This
     * field is required for credential-based authentication and MUST never
     * be returned in responses.
     */
    password: string;
  };

  /**
   * A compact, public-facing summary of an admin-capable user.
   *
   * This type is intentionally limited to non-sensitive fields suitable for
   * client presentation. It does not include authentication secrets or
   * internal-only metadata.
   */
  export type ISummary = {
    /**
     * Unique identifier of the user (community_portal_users.id).
     *
     * This is the canonical UUID used across the platform to identify the
     * account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The unique login handle for the user
     * (community_portal_users.username).
     *
     * Visible on profile pages and used for attribution of posts and
     * actions.
     */
    username: string;

    /**
     * Optional human-friendly display name
     * (community_portal_users.display_name).
     *
     * May be null or omitted by the client when not set; used for
     * presentation rather than identity.
     */
    display_name?: string | undefined;

    /**
     * Aggregated reputation score for the user
     * (community_portal_users.karma).
     *
     * This integer summarizes user reputation; the exact calculation method
     * is determined by platform policy.
     */
    karma: number & tags.Type<"int32">;

    /**
     * Timestamp when the user became a verified member
     * (community_portal_members.member_since).
     *
     * This property is useful for display on profile and for eligibility
     * checks. It may be omitted if membership metadata is not returned by
     * the server.
     */
    member_since?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Payload for refreshing admin authentication tokens.
   *
   * This object contains the refresh token issued to an administrator at
   * login. The server validates the token, checks admin account state
   * (active/admin record), and returns a renewed authorization response when
   * permitted.
   *
   * Do not include sensitive server-side fields (password_hash) in the
   * response. The refresh token presented here must be treated as
   * confidential in transit and storage.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued to the admin during authentication.
     * This token is an opaque string (for example, a JWT or other
     * long-lived token) that the server validates and rotates when issuing
     * a new access token. The server MUST validate that the token is bound
     * to an existing community_portal_users.id and that any associated
     * admin privileges (community_portal_admins.is_active) remain valid
     * before issuing new credentials.
     */
    refresh_token: string;
  };

  /**
   * Request payload to initiate an admin password reset.
   *
   * Provide the administrator's email address. The server will create a
   * time-limited, single-use reset token bound to the corresponding
   * community_portal_users.id (if an account exists) and deliver it to this
   * email address. For privacy and anti-enumeration, the endpoint's response
   * should not reveal whether a matching account was found.
   */
  export type IResetRequest = {
    /**
     * Email address of the admin account that requests a password reset.
     * This corresponds to community_portal_users.email in the database
     * schema. The server SHOULD validate format and, for privacy, return a
     * generic acknowledgement regardless of whether the email exists.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Acknowledgement response returned after initiating an admin password
   * reset request.
   *
   * This DTO is returned by the POST /auth/admin/password/reset operation. It
   * provides a user-facing, privacy-preserving confirmation that the reset
   * request workflow has been triggered. The response intentionally avoids
   * returning user identifiers or sensitive information.
   *
   * Business notes: The underlying Prisma model referenced by the request
   * flow is community_portal_users (email). This response does not and SHOULD
   * NOT expose community_portal_users.password_hash or any other sensitive
   * database fields.
   */
  export type IResetRequestResponse = {
    /**
     * Human-readable acknowledgement message confirming that a password
     * reset request has been received and that, if an account exists for
     * the supplied email, a reset token has been delivered to that
     * address.
     *
     * This message MUST be generic to avoid account enumeration and
     * therefore MUST NOT indicate whether the target email is present in
     * the community_portal_users table. Implementers should ensure the text
     * does not leak any PII or internal state.
     */
    message: string;
  };

  /**
   * Response returned by the admin password reset confirmation endpoint that
   * consumes a one-time token and sets a new password.
   *
   * This DTO corresponds to the completion step of the reset flow (POST
   * /auth/admin/password/confirm). It confirms whether the reset operation
   * succeeded and returns guidance for next steps. The implementation updates
   * community_portal_users.password_hash as part of the operation; for
   * security, this response MUST NOT include any sensitive data such as
   * password_hash, tokens, or internal identifiers.
   *
   * Audit note: Successful password resets SHOULD produce an audit entry
   * referencing the affected community_portal_users.id; however, audit
   * details are recorded server-side and are not included in this DTO.
   */
  export type IResetConfirm = {
    /**
     * Indicates whether the password reset token was validated and the
     * password change was applied successfully.
     *
     * A value of true means the password has been updated on the associated
     * community_portal_users record. A value of false indicates the reset
     * token was invalid, expired, or some other validation failed.
     */
    success: boolean;

    /**
     * A concise, user-facing message describing the result of the reset
     * confirmation attempt.
     *
     * When success=true the message SHOULD instruct the user to sign in
     * with the new credentials. When success=false the message SHOULD
     * provide non-sensitive guidance (for example: 'Invalid or expired
     * token. Request a new password reset.') and must not reveal internal
     * state.
     */
    message: string;
  };

  /**
   * Response returned after completing a password reset confirmation for an
   * admin account.
   *
   * This DTO acknowledges the outcome of a reset-confirm operation and
   * provides guidance to the client about next steps (for instance whether
   * the user must re-authenticate). It intentionally contains no sensitive
   * credential material and only includes minimal audit-friendly identifiers
   * when available.
   *
   * Use cases: returned by endpoints that consume a reset token and apply a
   * new password hash to the stored account record.
   */
  export type IResetConfirmResponse = {
    /**
     * Indicates whether the password reset operation completed
     * successfully.
     *
     * This boolean is true when the reset token was valid and the user's
     * password_hash was updated. It is false when the token was invalid,
     * expired, or the operation failed for other reasons.
     */
    success: boolean;

    /**
     * Human-readable acknowledgement message describing the outcome of the
     * reset operation.
     *
     * This message is suitable for direct display to the admin user in the
     * UI. It explains next steps (for example, instructing the user to
     * re-authenticate) and may include non-sensitive informational
     * guidance. Avoid including internal error codes or sensitive details.
     */
    message: string;

    /**
     * Identifier (UUID) of the affected user account when available.
     *
     * This field is provided for audit and client-side correlation. It may
     * be null in cases where the token could not be resolved to a concrete
     * user (for example, expired or invalid token). Do not expose other PII
     * in this response.
     */
    user_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Flag indicating whether the client should prompt the user to
     * re-authenticate.
     *
     * A value of true indicates the platform recommends or requires the
     * user to log in again (for example because tokens were rotated or
     * invalidated after the password change). A value of false means no
     * immediate reauthentication is necessary.
     */
    reauthenticate?: boolean | undefined;
  };

  /**
   * Request payload for an authenticated admin to change their account
   * password.
   *
   * This DTO carries the current credential and the desired new credential.
   * The server is responsible for verifying the current password, enforcing
   * password strength and reuse policies, hashing the new password securely,
   * and invalidating or rotating session/refresh tokens as required by
   * platform policy.
   *
   * Security notes: Clients must transmit this payload only over TLS. The API
   * should rate-limit this operation and require additional verification
   * (MFA) for privileged accounts if platform policy mandates.
   */
  export type IChangePassword = {
    /**
     * The current password for the authenticated admin account, provided in
     * plain text.
     *
     * This value MUST be verified server-side against the stored password
     * hash (community_portal_users.password_hash). It is required for
     * confidential operations to guard against session theft. Do not
     * transmit this value in logs or store it in plaintext.
     */
    currentPassword: string;

    /**
     * The new desired password provided in plain text.
     *
     * The server MUST validate this value against the platform's password
     * policy (length, complexity, breached-password checks) and then
     * compute and store a secure hash in
     * community_portal_users.password_hash. The plaintext newPassword MUST
     * never be returned in any API response or persisted in logs.
     */
    newPassword: string;
  };

  /**
   * Acknowledgement response returned after a successful or failed password
   * change operation for an admin account.
   *
   * This response object confirms whether the requested password change has
   * been applied. It intentionally omits sensitive data (for example,
   * password_hash) and instead provides audit-friendly metadata such as
   * updated_at and a user-facing message. The client should treat a
   * successful response as authoritative and follow any guidance provided in
   * the message (for example, prompting for reauthentication if
   * requires_reauthentication is true).
   *
   * The schema is intended for UI consumption and integration with
   * session-management flows. It provides multiple pieces of information: a
   * boolean success flag for programmatic checks, a localized message for
   * end-user display, an optional updated_at timestamp for audit display, and
   * an optional requires_reauthentication flag to instruct client behavior.
   */
  export type IChangePasswordResponse = {
    /**
     * True when the password change operation completed successfully.
     * Clients SHOULD interpret a value of true as confirmation that the
     * server has stored a new password hash and performed any associated
     * session/refresh-token invalidation actions required by policy.
     */
    success: boolean;

    /**
     * Human-readable, localized-ready message describing the outcome of the
     * password-change operation. This message is intended for display in
     * the client UI and may contain guidance such as whether
     * reauthentication is required or next steps.
     */
    message: string;

    /**
     * Timestamp (ISO 8601, UTC) when the password_hash field was updated on
     * the server for the affected account. Provided as an audit-friendly
     * hint; presence of this field indicates when the credential change was
     * applied.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * When true, the client SHOULD prompt the user to reauthenticate (for
     * example, perform a fresh login) because active sessions and refresh
     * tokens may have been revoked as part of the security policy.
     */
    requires_reauthentication?: boolean | undefined;
  };

  /**
   * Request payload for email verification of an admin account.
   *
   * Clients MUST provide the single-use verification token received by email.
   * The token is validated by the server and maps to a community_portal_users
   * / community_portal_members record; upon successful validation the server
   * sets is_email_verified = true for the membership record. The optional
   * user_id may be supplied when the verification workflow includes explicit
   * user identification, but it is not required and should not be relied upon
   * as the sole verification mechanism.
   *
   * This type is intentionally compact and excludes any sensitive or
   * internal-only fields. All tokens are expected to be treated as
   * confidential and transmitted over TLS only.
   */
  export type IVerifyEmail = {
    /**
     * One-time email verification token issued during account creation or
     * invitation flows. Tokens are time-limited and single-use. The server
     * validates this token and, on success, marks the related membership
     * record (community_portal_members.is_email_verified) as true.
     */
    token: string;

    /**
     * Optional UUID of the user associated with the verification token.
     * When provided, the server MAY use this as an additional lookup hint.
     * Clients SHOULD prefer supplying only the token; inclusion of user_id
     * is optional and only used when the verification flow requires
     * explicit user identification.
     */
    user_id?: (string & tags.Format<"uuid">) | undefined;
  };

  /**
   * Response returned after attempting to verify an administrator's email
   * address.
   *
   * This response conveys whether verification succeeded and may include a
   * brief, user-facing explanation and an optional minimal user summary
   * useful for client UI updates.
   */
  export type IVerifyEmailResponse = {
    /**
     * Indicates whether the email verification operation succeeded.
     *
     * True when the supplied verification token was valid and the
     * membership record was updated accordingly; false when the token was
     * invalid or expired.
     */
    success: boolean;

    /**
     * Human-friendly message describing the outcome of the verification
     * operation.
     *
     * This text is intended for UI display (confirmation or error
     * guidance). It SHOULD be concise and non-technical.
     */
    message?: string | undefined;

    /**
     * Optional lightweight summary of the affected admin user record.
     *
     * Included when the implementation chooses to return a compact
     * representation of the verified account to the client (for example,
     * after a successful verification). The summary contains safe,
     * public-facing properties only.
     */
    user?: ICommunityPortalAdmin.ISummary | undefined;
  };
}
