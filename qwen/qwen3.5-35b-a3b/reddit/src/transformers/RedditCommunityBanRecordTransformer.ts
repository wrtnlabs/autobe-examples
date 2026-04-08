import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityBanRecordTransformer {
  export type Payload = Prisma.reddit_community_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        unban_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: RedditCommunityMemberAtSummaryTransformer.select(),
        bannedBy: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityBanRecord> {
    return {
      id: input.id,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      unban_at: input.unban_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      user: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.user,
      ),
      bannedBy: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunityBanRecord;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityBanRecordTransformer {
//       export type Payload = Prisma.reddit_community_ban_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             banned_at: true,
//             unban_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user_id: true,
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//             banned_by_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_ban_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityBanRecord> {
//         return {
//   id: {string},
//   reason: {string},
//   banned_at: {string},
//   unban_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   user: {IRedditCommunityMember.ISummary},
//   bannedBy: {IRedditCommunityMember.ISummary},
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------