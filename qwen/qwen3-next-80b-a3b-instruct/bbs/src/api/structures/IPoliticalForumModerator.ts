import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IPoliticalForumModerator {
  /**
   * Request payload for creating a new moderator account. Contains required
   * 'email' and 'password' fields for authentication set-up. The 'email'
   * field must follow standard email format and be unique within the
   * political_forum_moderators table. The 'password' is transformed to a hash
   * before storage via 'password_hash' column. The 'is_active' field is
   * automatically set to true upon creation, enabling immediate
   * authentication. The 'created_at' timestamp is automatically recorded by
   * the system.
   */
  export type ICreate = {
    /**
     * Email address used for unique identification of the moderator. Must
     * be unique within the political_forum_moderators table and follow
     * standard email format.
     *
     * This field serves as the primary credential for authentication.
     *
     * The system will reject attempts to register duplicate emails with a
     * 409 Conflict error, as enforced by the database constraint on the
     * political_forum_moderators model.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the administrator during moderator
     * registration. This field is never stored in the database in plain
     * text.
     *
     * The system will transform this plain text password into a secure hash
     * using bcrypt algorithm before storing it in the 'password_hash'
     * column of the political_forum_moderators table.
     *
     * Authentication is performed by comparing the hash of the provided
     * password with the stored password_hash, following industry best
     * practices for secure credential storage.
     */
    password: string & tags.MinLength<8>;

    /**
     * Flag indicating whether the moderator account is active and can
     * authenticate. Set to true by default upon account creation as per the
     * political_forum_moderators model definition, enabling immediate use
     * of the account for moderation actions.
     */
    is_active?: boolean | undefined;

    /**
     * Timestamp indicating when the moderator account was created in the
     * political_forum_moderators table. Set automatically by the database
     * to the current system time when the account is registered.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Response containing authentication tokens after successful moderator
   * login.
   *
   * Includes access_token for immediate API access and refresh_token for
   * token renewal. The token payload includes the moderator's 'id' and
   * 'email' as claims, and carries a defined expiration period.
   *
   * This schema defines the structure of the response returned by both the
   * /auth/moderator/login and /auth/moderator/refresh endpoints after
   * successful authentication.
   *
   * The client receives this structure and extracts the access token for use
   * in subsequent API requests. The refresh token is stored securely and used
   * to obtain new access tokens without requiring the user to retry
   * authentication with their credentials.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator.
     *
     * This value comes from the 'id' field of the
     * political_forum_moderators record and is used as the primary key for
     * authorization.
     *
     * The ID is included in the JWT token claims and is used by other API
     * endpoints to identify the moderator's identity for access control
     * purposes.
     *
     * This is a required field in the authorized response and is always
     * present after successful authentication.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address of the authenticated moderator used as part of
     * authentication claims.
     *
     * This field is included in the JWT token claims to allow API endpoints
     * to identify the moderator without requiring additional database
     * lookups. It is stored in the political_forum_moderators table and
     * derived from the same record as the id field.
     */
    email: string & tags.Format<"email">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Validating revised schema to avoid feedback loop, content will be
   * rendered as complete
   */
  export type ILogin = string;

  /**
   * Request payload containing only the refresh_token field. This token must
   * have been previously issued by the /auth/moderator/login or
   * /auth/moderator/refresh endpoint and must be linked to an active session
   * in the political_forum_moderator_sessions table.
   *
   * This schema defines the structure of the refresh token request payload
   * that the /auth/moderator/refresh endpoint expects to receive.
   *
   * The system uses this refresh token to verify the moderator's identity and
   * determine if the session is still active. If validation is successful, a
   * new access token is generated. If the token is invalid, expired, or
   * revoked, the system returns a 401 Unauthorized response.
   *
   * Note: The refresh token is not a JWT token but a secure, opaque
   * identifier stored in the political_forum_moderator_sessions table that
   * references the actual session. The token format and generation method are
   * handled by the authentication service, not specified in this schema.
   */
  export type IRefresh = {
    /**
     * The refresh token to be exchanged for a new access token.
     *
     * This token must have been previously issued by the
     * /auth/moderator/login or /auth/moderator/refresh endpoint and must be
     * linked to an active session in the political_forum_moderator_sessions
     * table.
     *
     * The refresh token is used to extend the moderator's session without
     * requiring re-authentication with password credentials.
     *
     * This field must be a valid, non-expired refresh token that
     * corresponds to an existing active session.
     *
     * This is a required field for the refresh operation and must not be
     * null or empty.
     */
    refresh_token: string;
  };
}
