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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentVoteTransformer } from "../transformers/DiscussionBoardCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentVote.IUpdate;
}): Promise<IDiscussionBoardCommentVote> {
  // Validate that vote_type is provided for update
  if (props.body.vote_type === undefined) {
    throw new HttpException("vote_type must be provided for update", 400);
  }
  // First verify the vote exists and belongs to the user
  const existingVote =
    await MyGlobal.prisma.discussion_board_comment_votes.findUnique({
      where: {
        id: props.voteId,
        discussion_board_user_id: props.user.id,
      },
      select: {
        id: true,
        discussion_board_comment_id: true,
      },
    });
  if (!existingVote) {
    throw new HttpException(
      "Vote not found or you do not have permission to update it",
      404,
    );
  }
  // Verify the vote is associated with the specified comment
  if (existingVote.discussion_board_comment_id !== props.commentId) {
    throw new HttpException(
      "Vote does not belong to the specified comment",
      400,
    );
  }
  // Verify the comment is associated with the specified article
  const commentArticle =
    await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
      select: { id: true },
    });
  if (!commentArticle) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Update the vote with the new vote_type
  const updated = await MyGlobal.prisma.discussion_board_comment_votes.update({
    where: { id: props.voteId },
    data: {
      vote_type: props.body.vote_type,
      updated_at: toISOStringSafe(new Date()),
    },
    ...DiscussionBoardCommentVoteTransformer.select(),
  });
  return await DiscussionBoardCommentVoteTransformer.transform(updated);
}
