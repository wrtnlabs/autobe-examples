import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneSubscriptionCollector {
  export async function collect(props: {
    body: IRedditCloneSubscription.ICreate;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      member: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.body.communityId } },
    } satisfies Prisma.reddit_clone_subscriptionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneSubscriptionCollector {
//         export async function collect(props: {
//           body: IRedditCloneSubscription.ICreate;
//           redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       member: ...,
//       community: ...,
//           } satisfies Prisma.reddit_clone_subscriptionsCreateInput;
//         }
//       }
//--------------------------------------------------------------