import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /** Authorized JWT token data for the guest session. */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest session */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
