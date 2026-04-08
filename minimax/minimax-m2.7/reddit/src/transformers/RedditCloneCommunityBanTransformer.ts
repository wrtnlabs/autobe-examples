import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommunityBanTransformer {
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
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        bannedUser: RedditCloneMemberAtSummaryTransformer.select(),
        issuer: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan> {
    return {
      id: input.id,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      expiresAt: input.expires_at?.toISOString() ?? null,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedUser: await RedditCloneMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      issuer: await RedditCloneMemberAtSummaryTransformer.transform(
        input.issuer,
      ),
    } satisfies IRedditCloneCommunityBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityBanTransformer {
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
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//             reddit_clone_user_id: true,
//             issued_by_reddit_clone_user_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityBan> {
//         return {
//   id: {string},
//   reason: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   expiresAt: {string | null},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   bannedUser: {IRedditCloneMember.ISummary},
//   issuer: {IRedditCloneMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------