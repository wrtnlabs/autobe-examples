import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityProfileAtSummaryTransformer } from "./REdditLikeCommunityProfileAtSummaryTransformer";
import { RedditLikeCommunityPostImageTransformer } from "./RedditLikeCommunityPostImageTransformer";

export namespace REdditLikeCommunityPostTransformer {
  export type Payload = Prisma.reddit_like_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        body: true,
        url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            profile: REdditLikeCommunityProfileAtSummaryTransformer.select(),
          },
        },
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
        postImage: RedditLikeCommunityPostImageTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityPost> {
    if (!input.author.profile)
      throw new HttpException("Author profile not found", 404);
    const upVotes = input.postVotes.filter((v) => v.direction === "up").length;
    const downVotes = input.postVotes.filter(
      (v) => v.direction === "down",
    ).length;
    const commentCount = input.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      body: input.body,
      url: input.url,
      author: await REdditLikeCommunityProfileAtSummaryTransformer.transform(
        input.author.profile,
      ),
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      vote_score: upVotes - downVotes,
      comment_count: commentCount,
      postImage: input.postImage
        ? await RedditLikeCommunityPostImageTransformer.transform(
            input.postImage,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityPostTransformer {
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
//             author_id: true,
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             postImage: RedditLikeCommunityPostImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityPost> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   body: {string | null},
//   url: {string | null},
//   author: {IREdditLikeCommunityProfile.ISummary},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   vote_score: {integer},
//   comment_count: {integer},
//   postImage: input.postImage ? await RedditLikeCommunityPostImageTransformer.transform(input.postImage) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------