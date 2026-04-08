import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformSubscriptionCollector {
  export async function collect(props: {
    body: IRedditPlatformSubscription.ICreate;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      subscribed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.redditPlatformMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_platform_subscriptionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformSubscriptionCollector {
//         export async function collect(props: {
//           body: IRedditPlatformSubscription.ICreate;
//           redditPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       subscribed_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       user: ...,
//       community: ...,
//           } satisfies Prisma.reddit_platform_subscriptionsCreateInput;
//         }
//       }
//--------------------------------------------------------------