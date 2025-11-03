import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId } = props;

  // Fetch the article and verify it exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });

  // MANDATORY authorization check - verify ownership
  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own articles",
      403,
    );
  }

  // Prepare deletion timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Soft delete the article
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Cascade soft delete to related comments
  await MyGlobal.prisma.discussion_board_comments.updateMany({
    where: {
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Cascade soft delete to image attachments
  await MyGlobal.prisma.discussion_board_article_images.updateMany({
    where: {
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });

  // Cascade soft delete to document attachments
  await MyGlobal.prisma.discussion_board_article_documents.updateMany({
    where: {
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
}
