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
  // Step 1: Validate article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
      },
    });
  // Step 3: Verify comment belongs to the specified article
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to this article", 404);
  }
  // Step 4: Authorization check
  const isAuthor = comment.discussion_board_member_id === props.member.id;
  if (!isAuthor) {
    // Check if member has admin privileges
    const memberRecord =
      await MyGlobal.prisma.discussion_board_members.findUnique({
        where: { id: props.member.id },
        select: { email: true },
      });
    if (memberRecord) {
      const adminRecord =
        await MyGlobal.prisma.discussion_board_admins.findUnique({
          where: { email: memberRecord.email },
          select: { id: true, banned_at: true, deleted_at: true },
        });
      const isAdmin =
        adminRecord !== null &&
        adminRecord.banned_at === null &&
        adminRecord.deleted_at === null;
      if (!isAdmin) {
        throw new HttpException("Forbidden", 403);
      }
    } else {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 5: Soft delete the comment
  const now = new Date();
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
