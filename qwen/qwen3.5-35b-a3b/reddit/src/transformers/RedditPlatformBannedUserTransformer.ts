import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
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

export namespace RedditPlatformBannedUserTransformer {
  export type Payload = Prisma.reddit_platform_banned_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_banned_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformBannedUser> {
    return {
      id: input.id,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedBy: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformBannedUser;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformBannedUserTransformer {
//       export type Payload = Prisma.reddit_platform_banned_usersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             banned_at: true,
//             unbanned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user_id: true,
//             community: RedditPlatformCommunityAtSummaryTransformer.select(),
//             banned_by: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_banned_usersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformBannedUser> {
//         return {
//   id: {string},
//   reason: {string},
//   banned_at: {string},
//   unbanned_at: {string | null},
//   user: {IRedditPlatformMember.ISummary},
//   community: await RedditPlatformCommunityAtSummaryTransformer.transform(input.community),
//   bannedBy: {IRedditPlatformMember.ISummary},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------