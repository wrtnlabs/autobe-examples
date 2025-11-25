import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteDiscussionBoardMemberUserArticlesArticleIdAttachmentsAttachmentId(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Locate the attachment scoped to the given article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
      },
    });

  if (attachment === null) {
    // No attachment for this article/attachment combination
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.deleted_at !== null) {
    // Already soft-deleted: treat as not found for member-facing API
    throw new HttpException("Attachment not found", 404);
  }

  // 2. Ensure the parent article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 3. Ensure the authenticated member user owns the article.
  // Ownership is modeled via a separate subtype table linking articles to member users
  const memberArticle =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: {
        discussion_board_article_id: article.id,
        discussion_board_memberuser_id: props.memberUser.id,
      },
    });

  if (memberArticle === null) {
    // The current member does not own this article
    throw new HttpException(
      "You do not have permission to delete this attachment",
      403,
    );
  }

  // 4. Perform soft deletion by setting deleted_at and updating status
  const now: string = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_attachments.update({
    where: {
      id: props.attachmentId,
    },
    data: {
      deleted_at: now,
      status: "deleted",
      updated_at: now,
    },
  });

  return;
}
