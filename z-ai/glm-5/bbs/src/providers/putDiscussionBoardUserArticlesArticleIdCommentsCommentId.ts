import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string;
  commentId: string;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Find comment, verify it belongs to article and is not deleted
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      select: { discussion_board_user_id: true },
    });
  // Verify user is the author (only comment authors can edit, not even admins)
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update content if provided - trim whitespace and set updated_at timestamp
  if (props.body.content !== undefined) {
    await MyGlobal.prisma.discussion_board_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content.trim(),
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return updated comment with author relation loaded
  const updatedComment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...DiscussionBoardCommentTransformer.select(),
    });
  return await DiscussionBoardCommentTransformer.transform(updatedComment);
}
