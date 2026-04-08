import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommentAtSummaryTransformer {
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
        post: undefined,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        parent: undefined,
        replies: undefined,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCloneComment.ISummary[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditCloneComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      voteScore: input.vote_score,
      createdAt: input.created_at.toISOString(),
      replies: await cache.get(input.id),
    } satisfies IRedditCloneComment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCloneComment.ISummary[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditCloneComment.ISummary[]> => {
        const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
          ...select(),
          where: { parent_comment_id: parentId },
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
//     export namespace RedditCloneCommentAtSummaryTransformer {
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
//         cache: VariadicSingleton<Promise<IRedditCloneComment.ISummary[]>, [string]> = createChildrenCache(),
//       ): Promise<IRedditCloneComment.ISummary> {
//         return {
//   id: {string},
//   content: {string},
//   author: {IRedditCloneMember.ISummary},
//   voteScore: {integer},
//   createdAt: {string},
//   replies: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IRedditCloneComment.ISummary[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IRedditCloneComment.ISummary[]> => {
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