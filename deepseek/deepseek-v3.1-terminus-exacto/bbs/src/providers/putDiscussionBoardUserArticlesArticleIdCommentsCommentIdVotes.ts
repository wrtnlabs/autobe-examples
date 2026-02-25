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

export async function putDiscussionBoardUserArticlesArticleIdCommentsCommentIdVotes(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentVote.IUpdate;
}): Promise<IDiscussionBoardCommentVote> {
  // First verify that article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Verify comment exists and belongs to the specified article
  // Based on database schema, the foreign key field is discussion_board_article_id
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
    });
  // Check if vote already exists using the composite unique constraint
  const existingVote =
    await MyGlobal.prisma.discussion_board_comment_votes.findUnique({
      where: {
        discussion_board_user_id_discussion_board_comment_id: {
          discussion_board_user_id: props.user.id,
          discussion_board_comment_id: props.commentId,
        },
      },
    });
  const now = new Date();
  let vote;
  if (existingVote) {
    // Update existing vote
    vote = await MyGlobal.prisma.discussion_board_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: now,
      },
      ...DiscussionBoardCommentVoteTransformer.select(),
    });
  } else {
    // Create new vote - use relation property names with connect
    try {
      vote = await MyGlobal.prisma.discussion_board_comment_votes.create({
        data: {
          id: v4(),
          vote_type: props.body.vote_type,
          user: { connect: { id: props.user.id } },
          comment: { connect: { id: props.commentId } },
          created_at: now,
          updated_at: now,
        },
        ...DiscussionBoardCommentVoteTransformer.select(),
      });
    } catch (error) {
      // Handle unique constraint violation or other errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Race condition - another process created the vote while we were checking
        // Retry logic or simply throw appropriate error
        throw new HttpException("Vote already exists", 409);
      }
      throw error;
    }
  }
  // Transform using the transformer which converts Date objects to ISO strings
  return await DiscussionBoardCommentVoteTransformer.transform(vote);
}
