import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUser {
  /**
   * User registration data including unique email and plain password to be
   * hashed.
   *
   * This DTO is used to create a new user account in the system. It requires
   * a unique email address and a plaintext password, which the backend will
   * hash and store securely. The DTO excludes system managed fields such as
   * ID and timestamps.
   *
   * Clients must provide the email and password in the request body when
   * registering new users.
   *
   * @title ITodoListUser.ICreate
   */
  export type ICreate = {
    /**
     * Unique email address used for user login and communication. Must be a
     * valid email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password provided by the user during registration. Backend
     * system is responsible for hashing and securely storing this value.
     */
    password: string;
  };

  /**
   * Authorization response containing JWT token.
   *
   * This response is returned after successful authentication operations such
   * as user join, login, or token refresh. It provides the authenticated user
   * info along with the issued authorization tokens.
   *
   * Includes the user's unique identifier and the JWT authorization token
   * object that contains access token and refresh token.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * User login request schema for authentication.
   *
   * This schema requires email and plain text password for verifying
   * credentials against stored password hashes.
   *
   * Clients must provide a valid email and password to authenticate existing
   * users and obtain authorization tokens.
   */
  export type ILogin = {
    /** User's unique email address used for login. */
    email: string & tags.Format<"email">;

    /** User's plain text password used for authentication. */
    password: string;
  };

  /**
   * Request body for refreshing JWT tokens for a todo_list_users member user
   * session.
   *
   * This schema contains the refresh token string required to obtain new
   * access and refresh tokens without re-authenticating the user.
   *
   * The refresh_token property is mandatory as part of token lifecycle
   * management.
   */
  export type IRefresh = {
    /** Refresh token string provided when initial tokens are issued. */
    refresh_token: string;
  };
}
