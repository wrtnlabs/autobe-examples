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
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformCommentTransformer {
  export type Payload = Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
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
        post: RedditPlatformPostAtSummaryTransformer.select(),
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        parent: RedditPlatformCommentAtSummaryTransformer.select(),
        replies: {
          select: {},
        } satisfies Prisma.reddit_platform_commentsFindManyArgs,
        snapshots: {
          select: {},
        } satisfies Prisma.reddit_platform_comment_snapshotsFindManyArgs,
        votes: {
          select: {},
        } satisfies Prisma.reddit_platform_comment_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment> {
    return {
      id: input.id,
      content: input.content,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
      comment_count: input.comment_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      reddit_platform_post_id: input.post.id,
      reddit_platform_member_id: input.author.id,
      reddit_platform_comments_id: input.parent?.id ?? null,
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      parent: input.parent
        ? await RedditPlatformCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
    } satisfies IRedditPlatformComment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentTransformer {
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
//             reddit_platform_post_id: true,
//             reddit_platform_member_id: true,
//             reddit_platform_comments_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformComment> {
//         return {
//   id: {string},
//   content: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   reddit_platform_post_id: {string},
//   reddit_platform_member_id: {string},
//   reddit_platform_comments_id: {string | null},
//   post: {IRedditPlatformPost.ISummary},
//   author: {IRedditPlatformMember.ISummary},
//   parent: {IRedditPlatformComment.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------