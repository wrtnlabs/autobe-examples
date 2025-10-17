import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMinimalTodoUser {
  /**
   * Data required to create a new user account during registration.
   *
   * This interface defines the input parameters for user registration. The
   * system accepts a valid email address and a plain text password which is
   * then securely hashed before storage.
   *
   * Password validation occurs at the application level to ensure security
   * requirements are met before account creation proceeds.
   */
  export type ICreate = {
    /** Email address for the new user account. */
    email: string & tags.Format<"email">;

    /** Plain text password for account authentication. */
    password: string & tags.MinLength<8>;
  };

  /**
   * Authorization response containing user identity and JWT tokens.
   *
   * This response is returned after successful authentication operations such
   * as login, registration, or token refresh. It provides the authenticated
   * user's identity and the tokens required for accessing protected API
   * endpoints.
   *
   * The token property contains both access and refresh tokens with their
   * respective expiration information for complete session management.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Credentials required for user authentication during login.
   *
   * This interface defines the login parameters that users provide to access
   * their accounts. The system validates these credentials against stored
   * account information to establish authenticated sessions.
   *
   * Security measures include rate limiting and secure credential validation
   * to prevent unauthorized access attempts.
   */
  export type ILogin = {
    /** Registered email address for authentication. */
    email: string & tags.Format<"email">;

    /** Account password for authentication. */
    password: string;
  };

  /**
   * Refresh token data for obtaining new authentication tokens.
   *
   * This interface contains the refresh token required to obtain a new access
   * token when the current one expires. The system validates the refresh
   * token and issues new tokens if validation succeeds.
   *
   * Refresh tokens have their own expiration period and can be used to
   * maintain continuous access without requiring full re-authentication.
   */
  export type IRefresh = {
    /** Valid refresh token for obtaining new access token. */
    refresh: string;
  };
}
