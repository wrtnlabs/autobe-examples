import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityPostAtSummaryTransformer } from "./REdditLikeCommunityPostAtSummaryTransformer";

export namespace RedditLikeCommunityPostVoteTransformer {
  export type Payload = Prisma.reddit_like_community_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        post: REdditLikeCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostVote> {
    return {
      id: input.id,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await REdditLikeCommunityPostAtSummaryTransformer.transform(
        input.post,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostVoteTransformer {
//       export type Payload = Prisma.reddit_like_community_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             direction: true,
//             created_at: true,
//             updated_at: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             post: REdditLikeCommunityPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostVote> {
//         return {
//   id: {string},
//   direction: {string},
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   post: await REdditLikeCommunityPostAtSummaryTransformer.transform(input.post),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------