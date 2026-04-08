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
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformSubscriptionTransformer {
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
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformSubscription> {
    return {
      id: input.id,
      subscribed_at: input.subscribed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditPlatformSubscription;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformSubscriptionTransformer {
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
//             user: RedditPlatformMemberAtSummaryTransformer.select(),
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformSubscription> {
//         return {
//   id: {string},
//   subscribed_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   user: await RedditPlatformMemberAtSummaryTransformer.transform(input.user),
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------