import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postDiscussionBoardMemberUserArticlesArticleIdAttachments(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  const maxAttachmentsPerArticle = 50;
  const maxFileSizeBytes = 10 * 1024 * 1024; // 10MB
  const allowedContentTypes: string[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
  ];

  const { memberUser, articleId, body } = props;

  // Business rule: enforce maximum file size
  if (body.file_size > maxFileSizeBytes) {
    throw new HttpException(
      "Attachment file size exceeds maximum allowed limit.",
      400,
    );
  }

  // Business rule: enforce allowed content types
  if (!allowedContentTypes.includes(body.content_type)) {
    throw new HttpException("Attachment content type is not allowed.", 400);
  }

  // Verify parent article exists and is not logically deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (article === null) {
    throw new HttpException("Parent article not found or not editable.", 404);
  }

  // Ensure this member user is the author of the article
  const articleOfMember =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: {
        discussion_board_article_id: articleId,
        discussion_board_memberuser_id: memberUser.id,
      },
    });

  if (articleOfMember === null) {
    throw new HttpException(
      "You do not have permission to modify this article.",
      403,
    );
  }

  // Enforce maximum number of attachments per article (logical, non-deleted)
  const currentAttachmentCount =
    await MyGlobal.prisma.discussion_board_attachments.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (currentAttachmentCount >= maxAttachmentsPerArticle) {
    throw new HttpException(
      "Maximum number of attachments for this article has been reached.",
      400,
    );
  }

  // Transaction to maintain unique (discussion_board_article_id, order_in_article)
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find attachments whose order needs to be shifted
    const conflictingAttachments =
      await tx.discussion_board_attachments.findMany({
        where: {
          discussion_board_article_id: articleId,
          deleted_at: null,
          order_in_article: {
            gte: body.order_in_article,
          },
        },
        orderBy: {
          order_in_article: "desc",
        },
      });

    // Shift orders to make room for the new attachment
    for (const attachment of conflictingAttachments) {
      await tx.discussion_board_attachments.update({
        where: {
          id: attachment.id,
        },
        data: {
          order_in_article: attachment.order_in_article + 1,
        },
      });
    }

    // Create the new attachment row
    const createdAttachment = await tx.discussion_board_attachments.create({
      data: {
        id: v4(),
        discussion_board_article_id: articleId,
        file_uri: body.file_uri,
        file_name: body.file_name,
        content_type: body.content_type,
        file_size: body.file_size,
        order_in_article: body.order_in_article,
        status: body.status,
        created_at: new Date(),
        updated_at: new Date(),
        // deleted_at is managed by the database defaults
      },
    });

    return createdAttachment;
  });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    file_uri: created.file_uri,
    file_name: created.file_name,
    content_type: created.content_type,
    file_size: created.file_size,
    order_in_article: created.order_in_article,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
