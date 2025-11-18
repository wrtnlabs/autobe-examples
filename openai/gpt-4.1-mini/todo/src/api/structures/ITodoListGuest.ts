import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListGuest {
  /**
   * Payload for creating a temporary guest user account with an email and
   * password for limited access. Password is plain text and will be securely
   * hashed on server-side.
   */
  export type ICreate = {
    /**
     * Email address used to identify the guest user uniquely. Must be a
     * valid email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the guest user for account creation.
     * Server hashes it before storage.
     */
    password: string;
  };

  /**
   * Authorization response for guest user containing unique user ID and
   * authorization JWT tokens.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
