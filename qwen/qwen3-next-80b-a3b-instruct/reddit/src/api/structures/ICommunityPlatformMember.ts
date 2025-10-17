import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformMember {
  /**
   * Request payload for member registration containing email, username, and
   * password.
   *
   * This schema defines the exact input structure expected by the POST
   * /auth/member/join endpoint for creating a new member account.
   *
   * It maps directly to the required fields in the community_platform_member
   * table: email, username, and password_hash.
   *
   * The system validates uniqueness and complexity constraints before
   * creating the record.
   *
   * After successful registration, a corresponding email verification record
   * is created in the community_platform_email_verifications table, which
   * links to the new member via member_id.
   */
  export type IJoin = {
    /**
     * The email address for the new member account.
     *
     * This email serves as the primary identifier for authentication and
     * communication.
     *
     * Must be unique across the platform as enforced by the unique
     * constraint on the email field in the community_platform_member
     * table.
     *
     * The system sends a verification email to this address as part of the
     * membership onboarding process, using the
     * community_platform_email_verifications table to manage the
     * verification token.
     */
    email: string &
      tags.MinLength<5> &
      tags.MaxLength<254> &
      tags.Format<"email">;

    /**
     * The display username for the new member account.
     *
     * This username will be publicly visible in posts and comments.
     *
     * Must be unique across the platform as enforced by the unique
     * constraint on the username field in the community_platform_member
     * table.
     *
     * Only alphanumeric characters and underscores are allowed, as
     * specified in the pattern constraint.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">;

    /**
     * The password for the new member account.
     *
     * This password must meet the complexity requirements defined in the
     * business rules: at least 8 characters with at least one uppercase
     * letter, one lowercase letter, and one digit.
     *
     * The system will hash this password using bcrypt with a cost factor of
     * 12 before storing it in the password_hash field of the
     * community_platform_member table.
     *
     * The plaintext password is never stored and is immediately discarded
     * after hashing.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">;
  };

  /**
   * Authorization response containing JWT token.
   *
   * This response is returned after successful authentication operations such
   * as login, join, or token refresh. It contains the authenticated user's ID
   * and token information to establish a secure session.
   *
   * The token contains the user's role information and is signed with a
   * cryptographic key. This enables stateless authentication on subsequent
   * requests.
   *
   * The response is designed to be consumed by web and mobile clients to
   * maintain authentication state across requests. The ID field allows the
   * client to identify the user without exposing sensitive information like
   * email or username.
   *
   * The token property references the standard IAuthorizationToken type to
   * ensure consistent token structure across all user roles (member,
   * moderator, admin). This structure enables complete JWT token lifecycle
   * management.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member.
     *
     * This UUID is the primary key of the community_platform_member table
     * and is used to identify the user across all system operations.
     *
     * The field is required for linking authentication sessions and
     * user-specific data. It is returned in all authorization responses to
     * enable client-side user context management.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request payload for member login containing email and password for
   * authentication.
   *
   * This schema defines the structure of the login request body for member
   * users on the communityPlatform. It contains two required fields: email
   * and password, which are used to authenticate the user against the
   * system.
   *
   * The email field must be a valid email address that exists in the
   * community_platform_member table and has been verified (is_verified =
   * true). The password field must be the plaintext password that, when
   * hashed with bcrypt, matches the password_hash stored in the database.
   *
   * This schema is specifically designed for the /auth/member/login endpoint
   * and is used to initiate the authentication flow for member accounts. It
   * ensures all required authentication data is provided in a structured
   * format with proper validation constraints.
   *
   * The description references the specific fields required for
   * authentication and the business logic around password validation and
   * email verification as defined in the community_platform_member table
   * schema and function specification. This ensures complete alignment
   * between the API interface and the underlying data model.
   */
  export type ILogin = {
    /**
     * The email address associated with the member account for
     * authentication.
     *
     * This field is required for login operations and must match a
     * registered email in the community_platform_member table. The email
     * format must be valid according to standard email syntax rules.
     *
     * Business rules require this field to be unique across the platform,
     * and the system enforces this constraint during both registration and
     * login operations. This field is used to identify the user account in
     * the database and is crucial for the authentication process.
     *
     * The description references the email field in the
     * community_platform_member table, which has a unique constraint and is
     * not nullable, ensuring this field must be provided and correctly
     * formatted for successful authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password for authenticating the member account.
     *
     * This field contains the user's password in plaintext format as
     * submitted during the login request. The system will hash this
     * password using bcrypt with a cost factor of 12 before comparing it
     * against the stored password_hash in the community_platform_member
     * table.
     *
     * Business rules dictate that passwords must be at least 8 characters
     * long and contain at least one uppercase letter, one lowercase letter,
     * and one digit.
     *
     * This field is transmitted in plaintext during the login request but
     * is never stored in plaintext in any database records. The system
     * enforces this constraint to ensure secure password handling and
     * prevent plain-text password storage. The password_hash field in the
     * community_platform_member table stores the hashed version, while this
     * field contains the raw password provided by the user for
     * authentication.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Request payload for token refresh containing the refresh token (provided
   * in the HTTP-only cookie).
   *
   * This type represents the structure of the request body expected by the
   * /auth/member/refresh endpoint. The refresh token must be provided as an
   * HTTP-only cookie, not in the request body, but this schema defines the
   * token field as required for type consistency and validation.
   *
   * This schema is aligned with the community_platform_user_sessions table,
   * where refresh_token_hash is stored and validated during the refresh
   * operation.
   *
   * The object contains exactly one field: refresh_token, which corresponds
   * to the base64-encoded JWT string issued during login or previous
   * refresh.
   *
   * All other authentication data (user context, session status, device
   * information) is derived from the token's signature and verified against
   * the user_sessions table.
   */
  export type IRefresh = {
    /**
     * The refresh token used to authenticate the user and obtain a new
     * access token.
     *
     * This token is a long-lived credential issued during login or refresh
     * operations and is stored securely in an HTTP-only cookie.
     *
     * The token is validated by comparing its hash against the
     * refresh_token_hash stored in the community_platform_user_sessions
     * table.
     *
     * This field is mandatory for the refresh operation and must be
     * provided by the client in the HTTP-only cookie header. The refresh
     * token cannot be used to modify user state or access protected
     * resources directly; it is only valid for obtaining new access tokens.
     * For security, this token expires after 7 days even if unused, and is
     * rotated on each successful refresh.
     *
     * The refresh token is a JWT string signed with the server's private
     * key and contains minimal claims: the user ID, issuance time, and
     * expiration time. It never contains sensitive data like passwords,
     * emails, or roles.
     *
     * This field is strictly defined by the authentication system's
     * security model and corresponds to the refresh_token_hash field in the
     * community_platform_user_sessions table.
     */
    refresh_token: string;
  };
}
