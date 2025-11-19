import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Schema for the response after successful guest account creation or token
   * refresh. Contains the authentication token, expiration time, and guest
   * user ID.
   */
  export type IAuthorized = {
    /** The number of seconds until the token expires. */
    expiresIn: number & tags.Type<"int32">;

    /** The unique identifier for the guest user. */
    guestId: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * A constant value representing the schema name for discussion board
   * guests.
   *
   * This constant is used to identify the schema for creating guest accounts
   * on the discussion board.
   *
   * It is typically used in the context of authentication and authorization
   * to determine the type of user account being created or validated.
   */
  export type ICreate = string;
}
