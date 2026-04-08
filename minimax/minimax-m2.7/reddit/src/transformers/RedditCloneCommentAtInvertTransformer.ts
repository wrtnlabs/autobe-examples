import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneCommentAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditClonePostAtSummaryTransformer.select(),
        member: RedditCloneMemberAtSummaryTransformer.select(),
        parent: undefined,
        replies: undefined,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCloneComment.IInvert[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditCloneComment.IInvert> {
    return {
      id: input.id,
      content: input.deleted_at ? null : input.content,
      createdAt: toISOStringSafe(input.created_at),
      voteScore: input.vote_score,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      replies: await cache.get(input.id),
    } satisfies IRedditCloneComment.IInvert;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCloneComment.IInvert[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton<
      Promise<IRedditCloneComment.IInvert[]>,
      [string]
    >(async (parentId: string): Promise<IRedditCloneComment.IInvert[]> => {
      const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
        ...select(),
        where: { parent_comment_id: parentId },
        orderBy: { vote_score: Prisma.SortOrder.desc },
      });
      return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
    });
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommentAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             vote_score: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reddit_clone_post_id: true,
//             reddit_clone_member_id: true,
//             parent_comment_id: true,
//             replies: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.reddit_clone_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IRedditCloneComment.IInvert[]>, [string]> = createChildrenCache(),
//       ): Promise<IRedditCloneComment.IInvert> {
//         return {
//   id: {string},
//   content: {string | null},
//   createdAt: {string},
//   voteScore: {integer},
//   author: {IRedditCloneMember.ISummary},
//   post: {IRedditClonePost.ISummary},
//   replies: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IRedditCloneComment.IInvert[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IRedditCloneComment.IInvert[]> => {
//             const records =
//               await MyGlobal.prisma.reddit_clone_comments.findMany({
//                 ...select(),
//                 where: { parent_comment_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------