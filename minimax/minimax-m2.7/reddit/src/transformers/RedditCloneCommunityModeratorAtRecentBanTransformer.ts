import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommunityModeratorAtRecentBanTransformer {
  export type Payload = Prisma.reddit_clone_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        expires_at: true,
        community: {
          select: {
            id: true,
          },
        },
        member: {
          select: {
            id: true,
          },
        },
        moderator: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityModerator.IRecentBan> {
    return {
      id: input.id,
      memberId: input.member.id,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expires_at?.toISOString() ?? null,
    } satisfies IRedditCloneCommunityModerator.IRecentBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityModeratorAtRecentBanTransformer {
//       export type Payload = Prisma.reddit_clone_community_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             expires_at: true,
//             reddit_clone_community_id: true,
//             reddit_clone_member_id: true,
//             reddit_clone_community_moderator_id: true,
//           },
//         } satisfies Prisma.reddit_clone_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityModerator.IRecentBan> {
//         return {
//   id: {string},
//   memberId: {string},
//   reason: {string},
//   createdAt: {string},
//   expiresAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------