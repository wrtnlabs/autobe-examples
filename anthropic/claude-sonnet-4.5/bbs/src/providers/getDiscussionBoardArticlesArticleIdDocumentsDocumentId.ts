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

export async function getDiscussionBoardArticlesArticleIdDocumentsDocumentId(props: {
  articleId: string & tags.Format<"uuid">;
  documentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleDocument> {
  const { articleId, documentId } = props;

  const document =
    await MyGlobal.prisma.discussion_board_article_documents.findUniqueOrThrow({
      where: { id: documentId },
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

  if (document.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Document does not belong to the specified article",
      404,
    );
  }

  return {
    id: document.id,
    discussion_board_article_id: document.discussion_board_article_id,
    uploaded_by_member_id: document.uploaded_by_member_id,
    original_name: document.original_name,
    stored_name: document.stored_name,
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
    created_at: toISOStringSafe(document.created_at),
    deleted_at: document.deleted_at
      ? toISOStringSafe(document.deleted_at)
      : undefined,
    uploader: {
      id: document.uploader.id,
      username: document.uploader.username,
      display_name: document.uploader.display_name ?? undefined,
      profile_picture_url: document.uploader.profile_picture_url ?? undefined,
    },
  };
}
