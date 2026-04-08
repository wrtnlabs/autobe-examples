import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityBanCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityBan.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expires_at: props.body.expiresAt ?? null,
      community: { connect: { id: props.redditCloneCommunities.id } },
      bannedUser: { connect: { id: props.body.redditCloneUserId } },
      issuer: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneCommunityBanCollector {
//         export async function collect(props: {
//           body: IRedditCloneCommunityBan.ICreate;
//           redditCloneCommunities: IEntity; // from path parameter communityCode
// redditCloneMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       expires_at: ...,
//       community: ...,
//       bannedUser: ...,
//       issuer: ...,
//           } satisfies Prisma.reddit_clone_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------