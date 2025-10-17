import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformCommunityModerator {
  /**
   * Authorization response for community moderator with JWT token
   * information.
   */
  export type IAuthorized = {
    /** Authenticated user id. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Role kind for the session. */
    role?: "communityModerator" | undefined;
  };

  /** Security result after moderator password change. */
  export type ISecurity = {
    /**
     * Outcome summary of the password update (e.g., updated,
     * sessions_rotated).
     */
    status: string;
  };
}
