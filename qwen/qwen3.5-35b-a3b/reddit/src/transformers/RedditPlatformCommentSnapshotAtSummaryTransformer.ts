import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommentSnapshotAtSummaryTransformer {
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
        comment: true,
      },
    } satisfies Prisma.reddit_platform_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentSnapshot.ISummary> {
    return {
      id: input.id,
      original_comment_id: input.original_comment_id,
      post_id: input.post_id,
      author_id: input.author_id,
      reddit_platform_comment_id: input.comment.id,
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
      comment_created_at: input.comment_created_at.toISOString(),
      comment_updated_at: input.comment_updated_at.toISOString(),
      snapshot_created_at: input.snapshot_created_at.toISOString(),
    } satisfies IRedditPlatformCommentSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentSnapshotAtSummaryTransformer {
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
//             reddit_platform_comment_id: true,
//           },
//         } satisfies Prisma.reddit_platform_comment_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommentSnapshot.ISummary> {
//         return {
//   id: {string},
//   original_comment_id: {string},
//   post_id: {string},
//   author_id: {string},
//   reddit_platform_comment_id: {string},
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//   comment_created_at: {string},
//   comment_updated_at: {string},
//   snapshot_created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------