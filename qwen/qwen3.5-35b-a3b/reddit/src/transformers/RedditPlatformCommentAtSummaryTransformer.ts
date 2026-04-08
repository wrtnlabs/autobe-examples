import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
    parentCache: VariadicSingleton<
      Promise<IRedditPlatformComment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IRedditPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
      comment_count: input.comment_count,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
      parent:
        input.parent != null ? await parentCache.get(input.parent.id) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditPlatformComment.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        upvotes_count: true,
        downvotes_count: true,
        score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: true,
        post: RedditPlatformPostAtSummaryTransformer.select(),
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        replies: undefined,
        snapshots: undefined,
        votes: undefined,
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditPlatformComment.ISummary[]> {
    const parentCache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, parentCache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton<
      Promise<IRedditPlatformComment.ISummary>,
      [string]
    >(async (id: string): Promise<IRedditPlatformComment.ISummary> => {
      const record =
        await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
          ...select(),
          where: { id },
        });
      return transform(record, cache);
    });
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             upvotes_count: true,
//             downvotes_count: true,
//             score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.reddit_platform_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IRedditPlatformComment.ISummary>, [string]> = createParentCache(),
//       ): Promise<IRedditPlatformComment.ISummary> {
//         return {
//   id: {string},
//   content: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_count: {integer},
//   author: {IRedditPlatformMember.ISummary},
//   post: {IRedditPlatformPost.ISummary},
//   parent: input.parent_id ? await cache.get(input.parent_id) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IRedditPlatformComment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IRedditPlatformComment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------