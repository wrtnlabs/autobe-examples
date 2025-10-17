import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUser {
  /** Refresh token information for JWT renewal */
  export type IRefresh = {
    /** Refresh token for JWT renewal */
    refresh_token: string;
  };

  /**
   * Authorization response for a user, including the user's ID and JWT token
   * information.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
