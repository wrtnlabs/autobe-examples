import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformBanRecordSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_ban_record_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        unbanned_at: true,
        snapshot_created_at: true,
        banRecord: {
          select: {
            user: RedditPlatformMemberAtSummaryTransformer.select(),
            community: RedditPlatformCommunityAtSummaryTransformer.select(),
            bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_platform_ban_recordsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_ban_record_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformBanRecordSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.banRecord.user,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.banRecord.community,
      ),
      banned_by: input.banRecord.bannedBy
        ? await RedditPlatformMemberAtSummaryTransformer.transform(
            input.banRecord.bannedBy,
          )
        : null,
    } satisfies IRedditPlatformBanRecordSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformBanRecordSnapshotAtSummaryTransformer {
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
//             reddit_platform_ban_record_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_ban_record_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformBanRecordSnapshot.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   banned_at: {string},
//   unbanned_at: {string | null},
//   snapshot_created_at: {string},
//   user: {IRedditPlatformMember.ISummary},
//   community: {IRedditPlatformCommunity.ISummary},
//   banned_by: {IRedditPlatformMember.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------