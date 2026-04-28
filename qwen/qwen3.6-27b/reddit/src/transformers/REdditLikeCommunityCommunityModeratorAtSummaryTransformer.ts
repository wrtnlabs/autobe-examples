import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityCommunityModeratorAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_like_community_community_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: true,
        community: {
          select: { id: true },
        } satisfies Prisma.reddit_like_community_communitiesFindManyArgs,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        bans: {
          select: { id: true },
        } satisfies Prisma.reddit_like_community_community_bansFindManyArgs,
      },
    } satisfies Prisma.reddit_like_community_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunityModerator.ISummary> {
    return {
      id: input.id,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      role: input.role,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IREdditLikeCommunityCommunityModerator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityModeratorAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_community_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             role: true,
//             reddit_like_community_community_id: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunityModerator.ISummary> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   role: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------