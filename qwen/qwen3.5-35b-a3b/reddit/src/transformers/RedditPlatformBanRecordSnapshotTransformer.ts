import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformBanRecordTransformer } from "./RedditPlatformBanRecordTransformer";

export namespace RedditPlatformBanRecordSnapshotTransformer {
  export type Payload = Prisma.reddit_platform_ban_record_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_platform_user_id: true,
        reddit_platform_community_id: true,
        banned_by_id: true,
        banned_at: true,
        reason: true,
        unbanned_at: true,
        snapshot_created_at: true,
        banRecord: RedditPlatformBanRecordTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_ban_record_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformBanRecordSnapshot> {
    return {
      id: input.id,
      reddit_platform_ban_record_id: input.banRecord.id,
      reddit_platform_user_id: input.reddit_platform_user_id,
      reddit_platform_community_id: input.reddit_platform_community_id,
      banned_by_id: input.banned_by_id ?? null,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      banRecord: await RedditPlatformBanRecordTransformer.transform(
        input.banRecord,
      ),
    } satisfies IRedditPlatformBanRecordSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformBanRecordSnapshotTransformer {
//       export type Payload = Prisma.reddit_platform_ban_record_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reddit_platform_user_id: true,
//             reddit_platform_community_id: true,
//             banned_by_id: true,
//             banned_at: true,
//             reason: true,
//             unbanned_at: true,
//             snapshot_created_at: true,
//             banRecord: RedditPlatformBanRecordTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_ban_record_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformBanRecordSnapshot> {
//         return {
//   id: {string},
//   reddit_platform_ban_record_id: {string},
//   reddit_platform_user_id: {string},
//   reddit_platform_community_id: {string},
//   banned_by_id: {string | null},
//   reason: {string},
//   banned_at: {string},
//   unbanned_at: {string | null},
//   snapshot_created_at: {string},
//   banRecord: await RedditPlatformBanRecordTransformer.transform(input.banRecord),
//         };
//       }
//     }
//--------------------------------------------------------------