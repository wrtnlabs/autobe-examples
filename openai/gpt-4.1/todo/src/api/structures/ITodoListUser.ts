import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUser {
  /**
   * User registration DTO for minimal Todo List. Used as the request body in
   * the /auth/user/join endpoint. Includes only the minimum required
   * authentication fields—email and password. Extraneous fields are ignored.
   * Upon submission, email is checked for uniqueness and password is securely
   * hashed before storage.
   *
   * This type directly corresponds to user registration use cases and
   * enforces business constraints from the requirements analysis and Prisma
   * schema for todo_list_users.
   */
  export type IJoin = {
    /**
     * Unique user email address for registration and login. Must be in
     * valid email format. This field is required and serves as a unique
     * identifier in the minimal Todo List application. Email uniqueness is
     * enforced as per the business rules and Prisma schema constraints.
     *
     * Reference: Prisma todo_list_users.email column. Email is never
     * exposed or used for any purpose other than authentication and account
     * recovery.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password supplied for user registration. Must be between 8
     * and 72 characters for both security and technical compliance, even
     * though only the hash is stored in the database. This field is used
     * for login and never persisted in plain form. Password complexity
     * (minimum length) is enforced by business rules.
     *
     * Reference: Only a password_hash is stored in Prisma schema (column:
     * password_hash), but plain password is required during registration
     * and login. The application handles hashing before storage. Always
     * treat as confidential input.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<72>;
  };

  /**
   * Authorization response DTO returned after user registration, login, or
   * token refresh. Contains both the unique user ID (corresponding to
   * todo_list_users.id in the Prisma schema) and the issued authentication
   * tokens for secure session use. All operations after authentication
   * require this token.
   *
   * Fulfills minimal business and security requirements for session/auth
   * response as described in the requirements documentation and schema
   * definitions.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the registered user in the todo_list_users
     * table. Returned after successful authentication or registration. Used
     * as primary key for associating Todos and session information.
     *
     * Reference: Prisma todo_list_users.id column, which serves as the
     * user's identity throughout the application.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login request payload for authenticating a user in the Todo List
   * application.
   *
   * Contains both user email (unique identifier) and plain text password
   * (never hashed).
   *
   * This schema reflects core authentication logic for the login endpoint
   * referencing the todo_list_users Prisma model. Entry is required to begin
   * any authenticated session. Both fields undergo validation and strict type
   * enforcement.
   */
  export type ILogin = {
    /**
     * User's email address for login.
     *
     * Required for authentication and serves as the unique identifier
     * within the system. Must comply with RFC 5322 specifications for email
     * format. Enforced uniqueness in the underlying database by the
     * todo_list_users table, preventing duplicate accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * User's secret password in plain text (for login only, never stored
     * directly).
     *
     * Required for login; will be hashed before comparison to the
     * password_hash field. Password must meet minimum length constraints
     * and is subject to password policy checks. Not returned in responses
     * or logs for security reasons.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<72>;
  };

  /**
   * Refresh token request body for obtaining a new access token in the Todo
   * List application.
   *
   * This schema is required for session extension via the /auth/user/refresh
   * endpoint and is validated against issued refresh tokens. Only a valid,
   * non-expired refresh_token will result in new JWT credentials.
   */
  export type IRefresh = {
    /**
     * Refresh token value issued upon previous authentication, used to
     * obtain new JWT access/refresh tokens.
     *
     * Must be presented as an opaque token string issued by the backend and
     * managed securely on the client. Token is validated by the system and,
     * if valid and unexpired, a new access/refresh token pair is granted.
     * Required for token renewal workflows. Never stored in plain text on
     * the server side.
     */
    refresh_token: string;
  };
}
