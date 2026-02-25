import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneContentCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_content_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        reply_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        parentComment: true,
        post: true,
        replies: true,
        commentVotes: true,
        contentReports: true,
        votes: true,
        moderationLogs: true,
        moderationReports: true,
      },
    } satisfies Prisma.reddit_clone_content_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      voteScore: input.vote_score,
      replyCount: input.reply_count,
      createdAt: input.created_at.toISOString(),
    };
  }
}
