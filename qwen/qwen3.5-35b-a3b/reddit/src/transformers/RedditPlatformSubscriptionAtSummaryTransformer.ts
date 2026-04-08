import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";

export namespace RedditPlatformSubscriptionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        subscribed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformSubscription.ISummary> {
    return {
      id: input.id,
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      subscribed_at: input.subscribed_at?.toISOString() ?? undefined,
    } satisfies IRedditPlatformSubscription.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformSubscriptionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             subscribed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user_id: true,
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformSubscription.ISummary> {
//         return {
//   id: {string},
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//   deleted_at: {string | null},
//   subscribed_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------