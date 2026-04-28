import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityProfileAtSummaryTransformer } from "./REdditLikeCommunityProfileAtSummaryTransformer";

export namespace REdditLikeCommunityCommunityModeratorTransformer {
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
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        member: {
          select: {
            id: true,
            username: true,
            email: true,
            created_at: true,
            profile: REdditLikeCommunityProfileAtSummaryTransformer.select(),
          },
        },
        bans: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_community_community_bansFindManyArgs,
      },
    } satisfies Prisma.reddit_like_community_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityCommunityModerator> {
    if (input.member.profile === null) {
      throw new HttpException("Moderator profile not found", 404);
    }
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      role: input.role,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      member: {
        id: input.member.id,
        username: input.member.username,
        email: input.member.email,
        created_at: input.member.created_at.toISOString(),
      } satisfies IREdditLikeCommunityMember.ISummary,
      profile: await REdditLikeCommunityProfileAtSummaryTransformer.transform(
        input.member.profile,
      ),
    } satisfies IREdditLikeCommunityCommunityModerator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityCommunityModeratorTransformer {
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
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityCommunityModerator> {
//         return {
//   id: {string},
//   created_at: {string},
//   updated_at: {string},
//   role: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   profile: {IREdditLikeCommunityProfile.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------