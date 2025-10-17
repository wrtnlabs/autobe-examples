import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { ICommunityPortalUser } from "./ICommunityPortalUser";

export namespace ICommunityPortalModerator {
  /**
   * Payload for creating a new moderator account. This DTO is a request shape
   * and represents client-supplied fields used to create underlying records
   * (community_portal_users and community_portal_members). The server is
   * responsible for mapping and persisting these values to the Prisma models,
   * hashing the password into password_hash, creating the membership record
   * (is_email_verified=false), and performing any moderator-appointment
   * workflow.
   *
   * Security notes:
   *
   * - The 'password' field is required in this request schema as plaintext; the
   *   implementation MUST NOT accept a pre-hashed password from clients.
   * - This request schema intentionally does NOT include server-managed fields
   *   (id, created_at, updated_at) or internal-only columns (password_hash).
   */
  export type ICreate = {
    /**
     * Desired unique username for the moderator account. The server will
     * validate uniqueness against existing users.
     */
    username: string;

    /**
     * Email address for the moderator account. Used for verification and
     * notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the client. The server MUST hash and
     * salt this value before persisting to the database (do NOT store this
     * value as-is).
     */
    password: string;

    /** Optional human-friendly display name for the moderator profile. */
    display_name?: string | undefined;

    /**
     * Optional avatar image URI. If provided the server will validate and
     * store a reference.
     */
    avatar_uri?: (string & tags.Format<"uri">) | null | undefined;
  };

  /**
   * Authorization response for a moderator account.
   *
   * This object is returned after successful moderator authentication flows
   * (login, join for moderator accounts, or token refresh). It contains the
   * minimal public profile information derived from the
   * community_portal_users Prisma model and an authorization token container
   * under the property `token`.
   *
   * The shape intentionally exposes only public, non-sensitive fields from
   * the user record (id, username, display_name, avatar_uri, karma).
   * Sensitive authentication artifacts such as password_hash are never
   * included. When this schema is used, the server guarantees that every
   * property annotated as coming from the Prisma model actually exists on the
   * referenced model or is a safe relation-derived value.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the moderator (maps to
     * community_portal_users.id).
     *
     * This is the canonical UUID assigned to the user account. It is used
     * by clients to reference the authenticated moderator in subsequent
     * requests and must match the value stored in the database.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public username/handle for the moderator (maps to
     * community_portal_users.username).
     *
     * This value is unique across the platform and is intended for display
     * and attribution purposes.
     */
    username: string;

    /**
     * Human-friendly display name for the moderator (maps to
     * community_portal_users.display_name).
     *
     * This field is optional in the database but included here when present
     * for UI display. It may be null in some profiles.
     */
    display_name?: string | undefined;

    /**
     * Aggregated karma score for the moderator (maps to
     * community_portal_users.karma).
     *
     * This integer reflects reputation derived from community activity.
     * Calculation details are governed by business rules and may be
     * computed from vote events.
     */
    karma?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional URL for the moderator's avatar image (maps to
     * community_portal_users.avatar_uri).
     *
     * This is provided when available to help client UIs render a profile
     * picture. The server may normalize or proxy images; clients should
     * treat this as a display-only URI.
     */
    avatar_uri?: string | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login request payload for moderator authentication.
   *
   * Clients submit this object to authenticate a moderator using credentials
   * that map to the community_portal_users table. The server resolves the
   * `identifier` to a user record (by email or username), verifies the
   * `password` against the stored password hash, and returns an
   * ICommunityPortalModerator.IAuthorized response on success. This request
   * schema intentionally avoids exposing or accepting fields that would
   * mutate server-side accounts (for example, user id or password_hash).
   */
  export type ILogin = {
    /**
     * User identifier used to authenticate. This may be either the
     * moderator's email address or username. The server will resolve the
     * identifier to the corresponding community_portal_users record.
     */
    identifier: string;

    /**
     * Plain-text password provided by the user for authentication. The
     * server MUST hash and compare this value against the stored
     * password_hash. Clients MUST transmit this value only over secure
     * channels (TLS) and SHOULD not store it locally.
     */
    password: string;
  };

  /**
   * Request payload for renewing moderator authentication tokens.
   *
   * This object represents the minimal client request to obtain a fresh
   * access token (and optionally a rotated refresh token) for a moderator
   * account. The `refresh_token` property is mandatory and must contain the
   * previously issued refresh credential. The optional `device_id` value
   * (UUID) may be provided when the client tracks device-scoped sessions and
   * wishes the server to enforce device-bound token semantics.
   *
   * Security note: Do not include sensitive secrets other than the refresh
   * token. The server will perform membership and suspension checks against
   * the moderator's account before returning renewed tokens.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued by the authentication service. This
     * token MUST be presented exactly as issued (do not modify or trim).
     * Typical tokens are opaque strings or JWTs. The server will validate
     * token integrity, expiry, and binding to the user account before
     * issuing new access credentials.
     */
    refresh_token: string & tags.MinLength<10>;

    /**
     * Optional identifier of the device or client instance requesting token
     * renewal. When present, the server MAY validate that the refresh token
     * is bound to this device and may use the value for auditing and
     * token-rotation policies. This field is optional and may be omitted by
     * clients that do not track device identifiers.
     */
    device_id?: (string & tags.Format<"uuid">) | undefined;
  };

  /**
   * Payload to verify a moderator's email address.
   *
   * Provide the single-use `verification_token` issued at registration. The
   * server will resolve the token to the corresponding user account and
   * perform the verification; clients MUST NOT supply or attempt to override
   * the actor identity (for example, by submitting a `user_id`). Actor
   * identity is derived server-side from the token mapping and must never be
   * accepted from clients.
   *
   * Security note: Tokens are single-use and time-limited; on successful
   * verification the server will set the moderator membership record's
   * email-verified flag. If the token is invalid or expired, the server MUST
   * return an appropriate error (e.g., 400/401) without leaking internal
   * account identifiers.
   */
  export type IVerifyEmailRequest = {
    /**
     * Single-use verification token issued by the system during moderator
     * account registration. This token is time-limited and MUST be
     * submitted exactly as delivered in the verification email or
     * out-of-band message. Tokens are single-use and will be invalidated
     * after successful consumption or expiry.
     */
    verification_token: string & tags.MinLength<8>;
  };

  /**
   * Response returned after consuming an email verification token for a
   * moderator candidate.
   *
   * This response indicates whether the verification token was accepted and
   * the membership record was updated
   * (community_portal_members.is_email_verified = true). It MAY include a
   * minimal user summary (ICommunityPortalUser.ISummary) when the
   * implementation chooses to return the updated user view to the caller.
   *
   * The response never contains sensitive authentication data (for example,
   * password_hash) and is safe to display in client UIs.
   */
  export type IVerifyEmailResponse = {
    /**
     * Indicates whether the email verification succeeded.
     *
     * When true, the membership record
     * (community_portal_members.is_email_verified) has been set to true for
     * the linked user.
     */
    success: boolean;

    /**
     * Human-readable message describing the result of the verification
     * operation.
     *
     * Clients can display this message to inform the user of the
     * verification outcome or next steps.
     */
    message: string;

    /**
     * Optional minimal user summary reflecting the verified account or null
     * when the implementation chooses not to return user details. When
     * present, this object contains safe public fields from the
     * community_portal_users model (id, username, display_name, avatar_uri,
     * karma, created_at, updated_at). This property is nullable to reflect
     * cases where privacy or minimal responses are required.
     */
    user?: ICommunityPortalUser.ISummary | null | undefined;
  };

  /**
   * Request payload to initiate a password reset for a moderator account.
   *
   * The server uses the supplied email to locate the corresponding
   * community_portal_users record and, if present, issue a time-limited reset
   * token delivered to that email. To avoid account enumeration attacks the
   * API returns a generic confirmation message to callers regardless of
   * whether the email exists.
   */
  export type IRequestPasswordReset = {
    /**
     * The email address associated with the moderator account
     * (community_portal_users.email).
     *
     * This value must be a valid email address. For privacy, the server
     * will respond with a generic acknowledgement regardless of whether an
     * account exists for the supplied address.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Acknowledgement returned after a password reset request.
   *
   * This response intentionally provides a generic confirmation that a
   * password reset request was processed. It MUST NOT reveal whether the
   * supplied email address corresponds to an existing account. The primary
   * property is `message`, which contains user-facing text. Optional
   * properties such as `next_steps` and `case_id` may be provided by the
   * server for UX or support workflows.
   *
   * Use cases:
   *
   * - Returned by endpoints that initiate password-reset flows to inform the
   *   caller a reset was requested without exposing account existence.
   *
   * Security note:
   *
   * - Do not include any sensitive account information (for example, do NOT
   *   include email, user id, or password_hash).
   *
   * @title ICommunityPortalModerator.IRequestPasswordResetResponse
   */
  export type IRequestPasswordResetResponse = {
    /**
     * Human-readable confirmation message indicating that a password reset
     * request was received and that a reset artifact (e.g., email with a
     * reset link) will be sent if an account exists. This message is
     * intentionally generic to avoid account enumeration. Example: "If an
     * account exists for that email, a password reset link has been sent."
     */
    message: string;

    /**
     * Optional guidance for the client on next steps the user should take
     * (e.g., check email, allow up to X minutes). This field is optional
     * and may be omitted by the server if no additional guidance is
     * required.
     */
    next_steps?: string | undefined;

    /**
     * Optional support or case identifier provided when the system wishes
     * to surface a reference for the user's request. This field SHOULD NOT
     * reveal account existence and is optional for correlating support
     * tickets.
     */
    case_id?: string | undefined;
  };

  /**
   * Payload to complete a password reset using a reset token.
   *
   * This object is submitted to the reset-confirmation endpoint to finalize a
   * password reset. Required fields:
   *
   * - `resetToken`: the single-use token previously issued by the request-reset
   *   operation.
   * - `newPassword`: the new plaintext password which the server will securely
   *   hash.
   *
   * Optional field `rotateSessions` allows the client to indicate whether
   * existing sessions should be invalidated; servers SHOULD revoke existing
   * refresh tokens by default for security.
   *
   * Security guidance:
   *
   * - The server MUST validate token expiry and single-use semantics.
   * - The server MUST NOT echo the new password in any response and MUST apply
   *   secure hashing before storing.
   *
   * @title ICommunityPortalModerator.IResetPassword
   */
  export type IResetPassword = {
    /**
     * Single-use password reset token issued by the system (opaque string).
     * The token is time-limited and MUST be consumed by this endpoint to
     * authorize the password change. The server validates the token and
     * maps it to the target user account.
     */
    resetToken: string;

    /**
     * The user's desired new password in plaintext. The server will hash
     * and salt this value before persisting; the raw value MUST NOT be
     * stored. Password strength requirements SHOULD be enforced by the
     * server (e.g., minimum length, complexity). Example: a recommended
     * minimum length is 8 characters.
     */
    newPassword: string & tags.MinLength<8>;

    /**
     * Optional flag indicating whether existing sessions/refresh tokens
     * should be rotated/revoked after the password change. When true, the
     * server SHOULD revoke or rotate active refresh tokens for the affected
     * account to prevent session fixation. If omitted, the server applies
     * the default session-handling policy.
     */
    rotateSessions?: boolean | undefined;
  };

  /**
   * Response returned after completing a password reset flow for a moderator
   * account.
   *
   * This object is returned when a password reset token is consumed and the
   * server has attempted to update the moderator account's credential
   * (community_portal_users.password_hash). The response provides a simple
   * success indicator and a user-facing message summarizing the outcome.
   *
   * The response intentionally avoids returning sensitive data (such as
   * password hashes or tokens) and is suitable for direct display in client
   * UIs or for driving subsequent client workflows (for example, redirecting
   * the user to the login screen).
   */
  export type IResetPasswordResponse = {
    /**
     * Indicates whether the password reset operation was completed
     * successfully.
     *
     * This boolean is true when the reset token was valid and the new
     * password was accepted and persisted. It is false when the operation
     * failed due to an invalid or expired token, a violation of password
     * policy, or other validation errors.
     */
    success: boolean;

    /**
     * Human-readable, client-facing message describing the result of the
     * password reset attempt.
     *
     * Messages should be non-technical and actionable (for example:
     * "Password has been reset successfully. Please sign in with your new
     * password."). For security and privacy reasons, responses SHOULD NOT
     * disclose whether a specific email exists during request flows that
     * initiate resets; this property is intended for the final confirmation
     * after a valid reset token has been consumed.
     */
    message: string;
  };

  /**
   * Request payload to change an authenticated moderator's password.
   *
   * This DTO is used when an authenticated moderator wants to replace their
   * existing password. The server verifies the currentPassword against the
   * stored community_portal_users.password_hash and, if valid and the
   * newPassword satisfies password policy, replaces the stored hash with a
   * secure hash of newPassword. The server should also rotate or revoke
   * long-lived refresh tokens according to platform policy and record an
   * auditable event tied to the moderator's user id.
   */
  export type IChangePassword = {
    /**
     * The moderator's current plain-text password.
     *
     * This field must contain the current password for the authenticated
     * moderator and will be verified by the server against
     * community_portal_users.password_hash. The server MUST use a secure,
     * constant-time comparison and reject the request if verification
     * fails. Plain-text is required here because the server is responsible
     * for hashing and salting when updating the stored password hash.
     */
    currentPassword: string & tags.MinLength<8>;

    /**
     * The new plain-text password that the moderator wishes to set.
     *
     * The server MUST validate this value against the platform password
     * policy (minimum strength, banned passwords list, and any other
     * configured requirements) before hashing and persisting it in
     * community_portal_users.password_hash. The server MUST NOT accept a
     * pre-hashed password value from the client. For security, callers
     * SHOULD transmit this property only over TLS and clients SHOULD avoid
     * logging it.
     */
    newPassword: string & tags.MinLength<8>;
  };

  /**
   * Response returned after a successful or failed moderator password-change
   * operation.
   *
   * This response acknowledges the outcome of a change-password request
   * initiated by an authenticated moderator. It intentionally omits any
   * sensitive credential data (for example, the password or password_hash)
   * and contains only non-sensitive audit metadata and a user-facing
   * message.
   *
   * Properties:
   *
   * - Success: Boolean flag required to indicate success/failure.
   * - Message: Human-readable description of the result suitable for direct
   *   display to the user.
   * - UserId: Optional UUID of the affected user (maps to
   *   community_portal_users.id) included for client-side correlation and
   *   audit. Implementations MAY omit this for privacy.
   * - ChangedAt: Optional server timestamp in RFC3339/ISO-8601 format recording
   *   when the change was applied.
   *
   * Security note: This response MUST never include password contents or any
   * secret material. Use HTTPS and authenticated channels for transport.
   */
  export type IChangePasswordResponse = {
    /**
     * Indicates whether the password change operation completed
     * successfully.
     */
    success: boolean;

    /**
     * Human-readable message describing the result of the password change
     * operation. Intended for client display and may contain guidance or
     * next steps.
     */
    message: string;

    /**
     * The unique identifier of the user whose password was changed. This
     * corresponds to community_portal_users.id in the Prisma schema. This
     * field is optional and may be omitted by implementations that prefer
     * not to echo identifiers in responses.
     */
    userId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Timestamp (ISO 8601) when the password change was applied on the
     * server. Provided for auditing and client synchronization; if omitted
     * the client may assume the operation was applied immediately.
     */
    changedAt?: (string & tags.Format<"date-time">) | undefined;
  };
}
