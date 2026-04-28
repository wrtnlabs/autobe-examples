import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityCommunityModeratorAtSummaryTransformer } from "./REdditLikeCommunityCommunityModeratorAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityCommunityBanTransformer {
  export type Payload = Prisma.reddit_like_community_community_bansGetPayload<
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
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        moderator:
          REdditLikeCommunityCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunityBan> {
    return {
      id: input.id,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      moderator:
        await REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IREdditLikeCommunityCommunityBan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityBanTransformer {
//       export type Payload = Prisma.reddit_like_community_community_bansGetPayload<ReturnType<typeof select>>;
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
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             moderator: REdditLikeCommunityCommunityModeratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunityBan> {
//         return {
//   id: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   moderator: await REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform(input.moderator),
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------