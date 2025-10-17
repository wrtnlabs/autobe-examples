import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IUser {
  /** Authorization response containing JWT token information */
  export type IAuthorized = {
    /** Unique identifier of the authenticated user */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** User registration information for creating a new account */
  export type ICreate = {
    /** Hashed password for secure authentication */
    password_hash: string;

    /** Unique username chosen by the user for login */
    username: string;
  };

  /**
   * User login credentials.
   *
   * This type represents the credentials required for user login. It includes
   * the username and password.
   *
   * ## Properties
   *
   * - `username`: The username chosen by the user for login.
   * - `password`: The plain text password for authentication.
   */
  export type ILogin = string;
}
