import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdminUser {
  /** Authorization response for admin user with JWT token information. */
  export type IAuthorized = {
    /** Authenticated user id. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Role kind for the session. */
    role?: "adminUser" | undefined;
  };
}
