import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommentAtVoteTotalTransformer {
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
        post: true,
        author: true,
        parent: true,
        replies: true,
        snapshots: true,
        votes: true,
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment.IVoteTotal> {
    return {
      upvotes_count: input.upvotes_count,
      downvotes_count: input.downvotes_count,
      score: input.score,
    } satisfies IRedditPlatformComment.IVoteTotal;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentAtVoteTotalTransformer {
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
//           },
//         } satisfies Prisma.reddit_platform_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformComment.IVoteTotal> {
//         return {
//   upvotes_count: {integer},
//   downvotes_count: {integer},
//   score: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------