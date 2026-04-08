import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";

export namespace RedditCommunitySubscriptionAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.reddit_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySubscription.ISummary> {
    return {
      id: input.id,
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      status: typia.assert<"active" | "terminated">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditCommunitySubscription.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunitySubscriptionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunitySubscription.ISummary> {
//         return {
//   id: {string},
//   community: {IRedditCommunityCommunity.ISummary},
//   status: {"active" | "terminated"},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------