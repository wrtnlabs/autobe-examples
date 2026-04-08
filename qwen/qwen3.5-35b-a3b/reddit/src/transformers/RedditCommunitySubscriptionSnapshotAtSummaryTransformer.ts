import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunitySubscriptionSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_community_subscriptions_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        community_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot_created_at: true,
        subscription: true,
      },
    } satisfies Prisma.reddit_community_subscriptions_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySubscriptionSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunitySubscriptionSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunitySubscriptionSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_subscriptions_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             user_id: true,
//             community_id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             snapshot_created_at: true,
//             reddit_community_subscription_id: true,
//           },
//         } satisfies Prisma.reddit_community_subscriptions_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunitySubscriptionSnapshot.ISummary> {
//         return {
//   id: {string},
//   snapshot_created_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------