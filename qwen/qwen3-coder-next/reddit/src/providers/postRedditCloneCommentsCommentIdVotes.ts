import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentCommentAtVoteResultTransformer } from "../transformers/RedditCloneContentCommentAtVoteResultTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneCommentsCommentIdVotes(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneContentComment.IVote;
}): Promise<IRedditCloneContentComment.IVoteResult> {
  // Find comment first to ensure it exists
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  // Determine vote value
  const voteValue = props.body.type === "upvote" ? 1 : -1;
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_clone_content_comment_votes.findFirst({
      where: {
        comment_id: props.commentId,
        member_id: comment.member_id,
      },
    });
  let created: any;
  if (existingVote) {
    // Same vote removes (neutral)
    if (existingVote.vote_value === voteValue) {
      created = await MyGlobal.prisma.reddit_clone_content_comment_votes.delete(
        {
          where: { id: existingVote.id },
        },
      );
    } else {
      // Different vote updates
      created = await MyGlobal.prisma.reddit_clone_content_comment_votes.update(
        {
          where: { id: existingVote.id },
          data: {
            vote_value: voteValue,
            updated_at: toISOStringSafe(new Date()),
          },
        },
      );
    }
  } else {
    // New vote
    created = await MyGlobal.prisma.reddit_clone_content_comment_votes.create({
      data: {
        id: v4(),
        comment_id: props.commentId,
        member_id: comment.member_id,
        vote_value: voteValue,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Calculate new vote score
  const voteResults =
    await MyGlobal.prisma.reddit_clone_content_comment_votes.groupBy({
      by: ["comment_id"],
      where: { comment_id: props.commentId },
      _sum: { vote_value: true },
    });
  const newVoteScore = voteResults[0]?._sum.vote_value ?? 0;
  // Update comment vote score
  await MyGlobal.prisma.reddit_clone_content_comments.update({
    where: { id: props.commentId },
    data: { vote_score: newVoteScore },
  });
  // Transform and return
  return await RedditCloneContentCommentAtVoteResultTransformer.transform(
    created,
  );
}
