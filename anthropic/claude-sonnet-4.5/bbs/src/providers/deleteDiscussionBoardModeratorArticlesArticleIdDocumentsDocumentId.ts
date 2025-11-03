import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdDocumentsDocumentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  documentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, articleId, documentId } = props;

  // Find the document and verify it belongs to the specified article
  const document =
    await MyGlobal.prisma.discussion_board_article_documents.findFirst({
      where: {
        id: documentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (!document) {
    throw new HttpException("Document not found or already deleted", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_article_documents.update({
    where: {
      id: documentId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
