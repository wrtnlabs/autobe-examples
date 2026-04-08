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
    community: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role ?? "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.community.id } },
      member: { connect: { id: props.body.memberId } },
      assigner: { connect: { id: props.member.id } },
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