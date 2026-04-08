import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityModerator.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role ?? "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      community: { connect: { id: props.redditCloneCommunities.id } },
      member: { connect: { id: props.body.memberId } },
      assigner: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_community_moderatorsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneCommunityModeratorCollector {
//         export async function collect(props: {
//           body: IRedditCloneCommunityModerator.ICreate;
//           redditCloneCommunities: IEntity; // from path parameter communityId
// redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       role: ...,
//       created_at: ...,
//       updated_at: ...,
//       community: ...,
//       member: ...,
//       assigner: ...,
//       issuedBans: ...,
//           } satisfies Prisma.reddit_clone_community_moderatorsCreateInput;
//         }
//       }
//--------------------------------------------------------------