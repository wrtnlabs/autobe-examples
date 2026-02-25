import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppUser {
  /**
   * Request body for user registration. Contains email address and plain-text password for creating a new user account. The password will be securely hashed using bcrypt before storage.
   */
  export type IJoin = {
    /**
     * User's email address for account identification and login
     *
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password (minimum 8 characters) that will be securely hashed
     *
     * @x-autobe-database-schema-property password_hash
     */
    password: string & tags.MinLength<8> & tags.Format<"password">;
  };

  /**
   * Authentication response containing user information and access tokens.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user
     *
     * @x-autobe-specification Extracted from JWT payload userId claim. Computed from authenticated session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address of the authenticated user
     *
     * @x-autobe-specification Extracted from JWT payload email claim. Computed from authenticated session.
     */
    email: string & tags.Format<"email">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for user login authentication. Contains email address and password for credential verification against stored user credentials.
   */
  export type ILogin = {
    /**
     * User's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from users.email. Used to locate user record for authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * User's plain-text password for authentication.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain-text password input that will be hashed and compared against users.password_hash using bcrypt.
     */
    password: string;
  };

  /**
   * Request body for token refresh operation containing the refresh token issued during authentication. This refresh token is validated against stored session information to obtain new access and refresh tokens.
   */
  export type IRefresh = {
    /**
     * JWT refresh token issued during authentication for obtaining new access tokens.
     *
     * @x-autobe-specification Client-provided JWT refresh token for session validation. Server validates against stored session information in todo_app_user_sessions table.
     */
    refresh_token: string;
  };

  /**
   * Minimal user information for reference in other entities. Contains only essential identifiers and creation timestamp without privacy-sensitive data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_users.id. Primary key for user identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's primary email address.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_users.email. User's primary email address for identification.
     */
    email: string;

    /**
     * Timestamp when the user account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_users.created_at. Account creation timestamp.
     */
    created_at: string;
  };
}
