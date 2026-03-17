import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        is_edited: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        post: {
          select: { id: true },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        parent: {
          select: { id: true },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        replies: {
          select: { id: true },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_like_comment_snapshotsFindManyArgs,
        votes: {
          select: { id: true },
        } satisfies Prisma.reddit_like_comment_votesFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.reddit_like_report_of_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      vote_score: input.vote_score,
      is_edited: input.is_edited,
      is_deleted: input.is_deleted,
      created_at: input.created_at.toISOString(),
      parent_id: input.parent?.id ?? null,
      reply_count: input.replies.length,
    };
  }
}
