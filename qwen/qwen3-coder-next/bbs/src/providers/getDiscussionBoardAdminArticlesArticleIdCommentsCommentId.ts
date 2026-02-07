import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string;
  articleId: string;
}): Promise<IDiscussionBoardArticleComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    author: {
      id: comment.discussion_board_member_id,
      name: comment.discussion_board_member_id,
      email: comment.discussion_board_member_id,
    },
    article: {
      id: comment.discussion_board_article_id,
      title: comment.discussion_board_article_id,
    },
  };
}
