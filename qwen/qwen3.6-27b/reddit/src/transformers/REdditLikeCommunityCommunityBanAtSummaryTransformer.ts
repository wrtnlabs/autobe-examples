import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { REdditLikeCommunityCommunityModeratorAtSummaryTransformer } from "./REdditLikeCommunityCommunityModeratorAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityCommunityBanAtSummaryTransformer {
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
        community: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        moderator:
          REdditLikeCommunityCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunityBan.ISummary> {
    return {
      id: input.id,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      moderator:
        await REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    } satisfies IREdditLikeCommunityCommunityBan.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityBanAtSummaryTransformer {
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
//             reddit_like_community_community_id: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             moderator: REdditLikeCommunityCommunityModeratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_community_bansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunityBan.ISummary> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   moderator: await REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform(input.moderator),
//   reason: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------