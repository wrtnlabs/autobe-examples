import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticlesArticleIdDocuments(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDocument.ICreate;
}): Promise<IDiscussionBoardArticleDocument> {
  const { moderator, articleId, body } = props;

  // Verify article exists and get author
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check document count limit
  const existingDocuments =
    await MyGlobal.prisma.discussion_board_article_documents.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (existingDocuments >= 5) {
    throw new HttpException(
      "Maximum 5 document attachments per article exceeded",
      400,
    );
  }

  // Calculate total attachment size
  const sizeResult =
    await MyGlobal.prisma.discussion_board_article_documents.aggregate({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      _sum: {
        size_bytes: true,
      },
    });

  const currentTotalSize = sizeResult._sum.size_bytes ?? 0;

  if (currentTotalSize + body.size_bytes > 104857600) {
    throw new HttpException(
      "Total attachment size limit of 100MB exceeded",
      400,
    );
  }

  // Generate stored name from URL
  const urlParts = body.url.split("/");
  const lastPart = urlParts[urlParts.length - 1];
  const fileExtension = body.original_name.split(".").pop() ?? "bin";
  const storedName = lastPart || `${v4()}.${fileExtension}`;

  const now = toISOStringSafe(new Date());
  const documentId = v4();

  // Create document with article author as uploader
  const created =
    await MyGlobal.prisma.discussion_board_article_documents.create({
      data: {
        id: documentId,
        discussion_board_article_id: articleId,
        uploaded_by_member_id: article.discussion_board_member_id,
        original_name: body.original_name,
        stored_name: storedName,
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        created_at: now,
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
          },
        },
      },
    });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    uploaded_by_member_id: created.uploaded_by_member_id,
    original_name: created.original_name,
    stored_name: created.stored_name,
    mime_type: created.mime_type,
    size_bytes: created.size_bytes,
    created_at: now,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    uploader: {
      id: created.uploader.id,
      username: created.uploader.username,
      display_name: created.uploader.display_name ?? null,
      profile_picture_url: created.uploader.profile_picture_url ?? null,
    },
  };
}
