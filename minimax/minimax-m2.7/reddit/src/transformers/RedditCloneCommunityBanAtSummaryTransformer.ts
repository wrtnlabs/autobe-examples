import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expires_at: true,
        community: true,
        bannedUser: RedditCloneMemberAtSummaryTransformer.select(),
        issuer: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      expiresAt: input.expires_at?.toISOString() ?? null,
      bannedUser: await RedditCloneMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      issuer: await RedditCloneMemberAtSummaryTransformer.transform(
        input.issuer,
      ),
      isActive:
        !input.deleted_at &&
        (!input.expires_at || input.expires_at > new Date()),
    } satisfies IRedditCloneCommunityBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityBanAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_bansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             expires_at: true,
//             reddit_clone_community_id: true,
//             reddit_clone_user_id: true,
//             issued_by_reddit_clone_user_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityBan.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {null | string},
//   expiresAt: {null | string},
//   bannedUser: {IRedditCloneMember.ISummary},
//   issuer: {IRedditCloneMember.ISummary},
//   isActive: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------