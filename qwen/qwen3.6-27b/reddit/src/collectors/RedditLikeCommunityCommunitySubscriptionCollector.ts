import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityCommunitySubscriptionCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityCommunitySubscription.ICreate;
    redditLikeCommunityMembers: IEntity;
  }) {
    return {
      id: v4(),
      joined_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditLikeCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_like_community_community_subscriptionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditLikeCommunityCommunitySubscriptionCollector {
//         export async function collect(props: {
//           body: IRedditLikeCommunityCommunitySubscription.ICreate;
//           redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       joined_at: ...,
//       is_active: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       community: ...,
//           } satisfies Prisma.reddit_like_community_community_subscriptionsCreateInput;
//         }
//       }
//--------------------------------------------------------------