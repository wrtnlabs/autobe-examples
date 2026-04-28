import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityPostAtSummaryTransformer } from "./REdditLikeCommunityPostAtSummaryTransformer";

export namespace RedditLikeCommunityPostCommentTransformer {
  export type Payload = Prisma.reddit_like_community_post_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        authorMember: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        post: REdditLikeCommunityPostAtSummaryTransformer.select(),
        parentComment: undefined, // Not used in DTO
        childComments: undefined, // DO NOT select recursive relation
      },
    } satisfies Prisma.reddit_like_community_post_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditLikeCommunityPostComment[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditLikeCommunityPostComment> {
    return {
      id: input.id,
      body: input.body,
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.authorMember,
      ),
      post: await REdditLikeCommunityPostAtSummaryTransformer.transform(
        input.post,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      voteScore: 0,
      childComments: await cache.get(input.id),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditLikeCommunityPostComment[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditLikeCommunityPostComment[]> => {
        const records =
          await MyGlobal.prisma.reddit_like_community_post_comments.findMany({
            ...select(),
            where: { reddit_like_community_post_comment_id: parentId },
          });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostCommentTransformer {
//       export type Payload = Prisma.reddit_like_community_post_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             deleted_at: true,
//             body: true,
//             updated_at: true,
//             reddit_like_community_post_comment_id: true,
//             reddit_like_community_member_id: true,
//             reddit_like_community_post_id: true,
//             childComments: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_post_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IRedditLikeCommunityPostComment[]>, [string]> = createChildrenCache(),
//       ): Promise<IRedditLikeCommunityPostComment> {
//         return {
//   id: {string},
//   body: {string},
//   author: {IREdditLikeCommunityMember.ISummary},
//   post: {IREdditLikeCommunityPost.ISummary},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   voteScore: {integer},
//   childComments: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IRedditLikeCommunityPostComment[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IRedditLikeCommunityPostComment[]> => {
//             const records =
//               await MyGlobal.prisma.reddit_like_community_post_comments.findMany({
//                 ...select(),
//                 where: { reddit_like_community_post_comment_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------