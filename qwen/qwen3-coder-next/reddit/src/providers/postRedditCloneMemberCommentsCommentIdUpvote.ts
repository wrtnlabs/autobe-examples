import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentVoteAtResponseTransformer } from "../transformers/RedditCloneCommentVoteAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommentsCommentIdUpvote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommentVote.IResponse> {
  // Verify comment exists
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_clone_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        comment_id: props.commentId,
      },
    });
  if (existingVote) {
    throw new HttpException("Already voted", 409);
  }
  // Create vote record
  const vote = await MyGlobal.prisma.reddit_clone_comment_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.member.id,
      comment_id: props.commentId,
      vote: 1,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      member: true,
      comment: true,
    },
  });
  // Increment comment vote score
  await MyGlobal.prisma.reddit_clone_content_comments.update({
    where: { id: props.commentId },
    data: { vote_score: { increment: 1 } },
  });
  // Return transformed response
  return await RedditCloneCommentVoteAtResponseTransformer.transform(vote);
}
