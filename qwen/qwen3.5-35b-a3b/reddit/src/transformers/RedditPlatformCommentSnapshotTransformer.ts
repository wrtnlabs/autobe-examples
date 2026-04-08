import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
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

export namespace RedditPlatformCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_platform_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_comment_id: true,
        post_id: true,
        author_id: true,
        parent_comment_id: true,
        content: true,
        upvotes_count: true,
        downvotes_count: true,
        score: true,
        comment_created_at: true,
        comment_updated_at: true,
        snapshot_created_at: true,
        comment: RedditPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentSnapshot> {
    return {
      id: input.id,
      originalComment:
        await RedditPlatformCommentAtSummaryTransformer.transform(
          input.comment,
        ),
      post: input.post_id,
      author: input.author_id,
      parentComment: input.parent_comment_id,
      content: input.content,
      upvotesCount: Number(input.upvotes_count),
      downvotesCount: Number(input.downvotes_count),
      score: Number(input.score),
      commentCreatedAt: input.comment_created_at.toISOString(),
      commentUpdatedAt: input.comment_updated_at.toISOString(),
      snapshotCreatedAt: input.snapshot_created_at.toISOString(),
    } satisfies IRedditPlatformCommentSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentSnapshotTransformer {
//       export type Payload = Prisma.reddit_platform_comment_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             original_comment_id: true,
//             post_id: true,
//             author_id: true,
//             parent_comment_id: true,
//             content: true,
//             upvotes_count: true,
//             downvotes_count: true,
//             score: true,
//             comment_created_at: true,
//             comment_updated_at: true,
//             snapshot_created_at: true,
//             comment: RedditPlatformCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_comment_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommentSnapshot> {
//         return {
//   id: {string},
//   originalComment: await RedditPlatformCommentAtSummaryTransformer.transform(input.comment),
//   post: {string},
//   author: {string},
//   parentComment: {string | null},
//   content: {string},
//   upvotesCount: {integer},
//   downvotesCount: {integer},
//   score: {integer},
//   commentCreatedAt: {string},
//   commentUpdatedAt: {string},
//   snapshotCreatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------