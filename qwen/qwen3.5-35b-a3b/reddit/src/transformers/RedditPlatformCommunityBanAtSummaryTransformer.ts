import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunityBanAtSummaryTransformer {
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
        community: true,
        bannedBy: true,
      },
    } satisfies Prisma.reddit_platform_banned_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityBan.ISummary> {
    return {
      id: input.id,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
    } satisfies IRedditPlatformCommunityBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunityBanAtSummaryTransformer {
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
//             community_id: true,
//             banned_by: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_banned_usersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunityBan.ISummary> {
//         return {
//   id: {string},
//   user: {IRedditPlatformMember.ISummary},
//   reason: {string},
//   banned_at: {string},
//   unbanned_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------