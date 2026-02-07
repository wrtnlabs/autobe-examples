import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Verify the comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify the vote exists and belongs to the comment
  const vote = await MyGlobal.prisma.discussion_board_comment_votes.findUnique({
    where: {
      id: props.voteId,
      discussion_board_comment_id: props.commentId,
    },
    select: { discussion_board_user_id: true },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Check authorization: user must own the vote
  if (vote.discussion_board_user_id !== props.user.id) {
    throw new HttpException("You can only delete your own votes", 403);
  }
  // Delete the vote
  await MyGlobal.prisma.discussion_board_comment_votes.delete({
    where: { id: props.voteId },
  });
}
