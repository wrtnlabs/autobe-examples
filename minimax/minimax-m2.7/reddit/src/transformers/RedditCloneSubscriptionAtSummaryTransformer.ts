import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";

export namespace RedditCloneSubscriptionAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        member: {
          select: {
            id: true,
            username: true,
          },
        },
        community: RedditCloneCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneSubscription.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneSubscriptionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             reddit_clone_member_id: true,
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneSubscription.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------