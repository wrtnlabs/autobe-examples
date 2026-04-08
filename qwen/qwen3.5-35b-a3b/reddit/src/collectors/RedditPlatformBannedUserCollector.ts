import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformBannedUserCollector {
  export async function collect(props: {
    body: IRedditPlatformBannedUser.ICreate;
    community: IEntity;
    bannedBy: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      banned_at: new Date(),
      unbanned_at: props.body.expiration_date ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.body.user_id } },
      community: { connect: { id: props.community.id } },
      bannedBy: { connect: { id: props.bannedBy.id } },
    } satisfies Prisma.reddit_platform_banned_usersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformBannedUserCollector {
//         export async function collect(props: {
//           body: IRedditPlatformBannedUser.ICreate;
//           redditPlatformCommunities: IEntity; // from path parameter {communityName}
// redditPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       banned_at: ...,
//       unbanned_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       user: ...,
//       community: ...,
//       bannedBy: ...,
//           } satisfies Prisma.reddit_platform_banned_usersCreateInput;
//         }
//       }
//--------------------------------------------------------------