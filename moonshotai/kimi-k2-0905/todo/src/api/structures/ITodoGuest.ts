import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoGuest {
  /**
   * Guest user authorization response with session tokens.
   *
   * Represents successful guest registration or session refresh, providing
   * authentication tokens for accessing demonstration content.
   */
  export type IAuthorized = {
    /** Unique guest session identifier */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Guest session identifier for demonstration content access */
    session_identifier: string;
  };
}
