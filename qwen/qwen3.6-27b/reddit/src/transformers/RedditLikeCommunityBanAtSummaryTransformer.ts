import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_bansGetPayload<
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
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        bannedMember: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        issuingModerator:
          REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      bannedMember:
        await REdditLikeCommunityMemberAtSummaryTransformer.transform(
          input.bannedMember,
        ),
      issuingModerator:
        await REdditLikeCommunityMemberAtSummaryTransformer.transform(
          input.issuingModerator,
        ),
    } satisfies IRedditLikeCommunityBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityBanAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_bansGetPayload<ReturnType<typeof select>>;
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
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             reddit_like_community_banned_member_id: true,
//             reddit_like_community_issuing_moderator_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityBan.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   bannedMember: {IREdditLikeCommunityMember.ISummary},
//   issuingModerator: {IREdditLikeCommunityMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------