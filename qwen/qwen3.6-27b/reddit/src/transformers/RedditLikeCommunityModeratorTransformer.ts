import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityModeratorTransformer {
  export type Payload = Prisma.reddit_like_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        authority_type: true,
        created_at: true,
        updated_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityModerator> {
    return {
      id: input.id,
      authority_type: input.authority_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
    } satisfies IRedditLikeCommunityModerator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityModeratorTransformer {
//       export type Payload = Prisma.reddit_like_community_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             authority_type: true,
//             created_at: true,
//             updated_at: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityModerator> {
//         return {
//   id: {string},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   authority_type: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------