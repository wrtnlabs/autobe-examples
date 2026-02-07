import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentVoteCollector } from "../collectors/DiscussionBoardCommentVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentVoteTransformer } from "../transformers/DiscussionBoardCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdCommentsCommentIdVotes(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentVote.ICreate;
}): Promise<IDiscussionBoardCommentVote> {
  // Validate article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Validate comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Check if user has already voted on this comment
  const existingVote =
    await MyGlobal.prisma.discussion_board_comment_votes.findFirst({
      where: {
        discussion_board_user_id: props.user.id,
        discussion_board_comment_id: props.commentId,
      },
    });
  if (existingVote) {
    throw new HttpException("You have already voted on this comment", 409);
  }
  // Create the vote using collector
  const created = await MyGlobal.prisma.discussion_board_comment_votes.create({
    data: await DiscussionBoardCommentVoteCollector.collect({
      body: props.body,
      user: { id: props.user.id } as IEntity,
      comment: { id: props.commentId } as IEntity,
    }),
    ...DiscussionBoardCommentVoteTransformer.select(),
  });
  // Transform and return the response
  return await DiscussionBoardCommentVoteTransformer.transform(created);
}
