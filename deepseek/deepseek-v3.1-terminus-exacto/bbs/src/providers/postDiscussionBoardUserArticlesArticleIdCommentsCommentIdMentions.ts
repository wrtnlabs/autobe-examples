import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentMentionCollector } from "../collectors/DiscussionBoardCommentMentionCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentMentionTransformer } from "../transformers/DiscussionBoardCommentMentionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdCommentsCommentIdMentions(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentMention.ICreate;
}): Promise<IDiscussionBoardCommentMention> {
  // Validate position values
  if (props.body.position_end <= props.body.position_start) {
    throw new HttpException(
      "Position end must be greater than position start",
      400,
    );
  }
  // Validate that the comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Validate position bounds against comment content length
  if (props.body.position_end > comment.content.length) {
    throw new HttpException(
      "Position values exceed comment content length",
      400,
    );
  }
  // Verify that the mentioned user exists
  const mentionedUser = await MyGlobal.prisma.discussion_board_users.findUnique(
    {
      where: {
        id: props.body.discussion_board_user_id,
        deleted_at: null,
      },
    },
  );
  if (!mentionedUser) {
    throw new HttpException("Mentioned user not found", 404);
  }
  try {
    // Create the mention record using the collector
    const created =
      await MyGlobal.prisma.discussion_board_comment_mentions.create({
        data: await DiscussionBoardCommentMentionCollector.collect({
          body: props.body,
          discussionBoardComments: { id: props.commentId },
          discussionBoardUsers: { id: props.user.id },
        }),
        ...DiscussionBoardCommentMentionTransformer.select(),
      });
    return await DiscussionBoardCommentMentionTransformer.transform(created);
  } catch (error) {
    // Handle unique constraint violations
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("User already mentioned in this comment", 409);
    }
    throw error;
  }
}
