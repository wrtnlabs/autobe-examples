import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace REdditLikeCommunityPostAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        author: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        postVotes: {
          select: {
            direction: true,
          },
        } satisfies Prisma.reddit_like_community_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.reddit_like_community_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityPost.ISummary> {
    const upVotes = input.postVotes.filter((v) => v.direction === "up").length;
    const downVotes = input.postVotes.filter(
      (v) => v.direction === "down",
    ).length;
    const activeComments = input.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      vote_score: upVotes - downVotes,
      comment_count: activeComments,
      created_at: input.created_at.toISOString(),
    } satisfies IREdditLikeCommunityPost.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityPostAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             post_type: true,
//             body: true,
//             url: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             author: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityPost.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.author),
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   vote_score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------