import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunitySubscriptionCollector {
  export async function collect(props: {
    body: IRedditCommunitySubscription.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCommunityMembers.id } },
      community: {
        connect: { id: props.body.reddit_community_communities_id },
      },
      snapshots: undefined,
    } satisfies Prisma.reddit_community_subscriptionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunitySubscriptionCollector {
//         export async function collect(props: {
//           body: IRedditCommunitySubscription.ICreate;
//           redditCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       community: ...,
//       snapshots: ...,
//           } satisfies Prisma.reddit_community_subscriptionsCreateInput;
//         }
//       }
//--------------------------------------------------------------