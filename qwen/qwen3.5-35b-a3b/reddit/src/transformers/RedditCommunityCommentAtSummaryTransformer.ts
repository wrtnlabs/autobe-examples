import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        parent: true,
        votes: true,
        replies: true,
        post: true,
        redditCommunityCommentReports: true,
        redditCommentReports: true,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      vote_count: input.votes.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      is_top_level: input.parent === null,
      reply_count: input.replies.length,
    } satisfies IRedditCommunityComment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityCommentAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reddit_community_post_id: true,
//             author: RedditCommunityMemberAtSummaryTransformer.select(),
//             reddit_community_comment_id: true,
//           },
//         } satisfies Prisma.reddit_community_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityComment.ISummary> {
//         return {
//   id: {string},
//   content: {string},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.author),
//   vote_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   is_top_level: {boolean},
//   reply_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------