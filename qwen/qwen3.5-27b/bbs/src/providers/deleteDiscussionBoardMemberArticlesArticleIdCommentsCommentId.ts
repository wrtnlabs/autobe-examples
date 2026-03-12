import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment and verify it exists and is not already deleted
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
        discussion_board_article_id: true,
      },
    });
  // Verify the comment belongs to the specified article
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment not found", 404);
  }
  // Check if the member is the comment author
  const isAuthor = comment.discussion_board_member_id === props.member.id;
  // If not the author, check if the member has administrator privileges
  let isAdmin = false;
  if (!isAuthor) {
    const admin =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: {
          id: props.member.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    isAdmin = admin !== null;
  }
  // Verify authorization: must be author or administrator
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft deletion by setting deleted_at to current timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
