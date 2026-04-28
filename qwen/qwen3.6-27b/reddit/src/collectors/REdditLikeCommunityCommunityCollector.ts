import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityCommunityCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityCommunity.ICreate;
    redditLikeCommunityMembers: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      icon_uri: props.body.icon_uri ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      creator: { connect: { id: props.redditLikeCommunityMembers.id } },
    } satisfies Prisma.reddit_like_community_communitiesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityCommunityCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityCommunity.ICreate;
//           redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       icon_uri: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       creator: ...,
//       subscriptions: ...,
//       moderatorAssignments: ...,
//       communityBans: ...,
//       snapshots: ...,
//       posts: ...,
//       postSnapshots: ...,
//       moderators: ...,
//       bans: ...,
//       reports: ...,
//           } satisfies Prisma.reddit_like_community_communitiesCreateInput;
//         }
//       }
//--------------------------------------------------------------