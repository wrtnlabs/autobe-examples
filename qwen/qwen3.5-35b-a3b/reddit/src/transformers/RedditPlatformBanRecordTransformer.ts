import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
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

export namespace RedditPlatformBanRecordTransformer {
  export type Payload = Prisma.reddit_platform_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
        snapshot: true,
        snapshots: true,
        banned_at: true,
        unbanned_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_platform_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformBanRecord> {
    return {
      id: input.id,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      banned_by: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformBanRecord;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformBanRecordTransformer {
//       export type Payload = Prisma.reddit_platform_ban_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             banned_at: true,
//             unbanned_at: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user_id: true,
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//             banned_by: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_ban_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformBanRecord> {
//         return {
//   id: {string},
//   user: {IRedditPlatformMember.ISummary},
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   banned_by: {IRedditPlatformMember.ISummary},
//   banned_at: {string},
//   unbanned_at: {string | null},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------