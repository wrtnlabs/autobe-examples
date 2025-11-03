import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdDocumentsDocumentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  documentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, documentId } = props;

  // Fetch the document with article relationship to verify ownership
  const document =
    await MyGlobal.prisma.discussion_board_article_documents.findFirst({
      where: {
        id: documentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      include: {
        article: true,
      },
    });

  if (!document) {
    throw new HttpException("Document not found or already deleted", 404);
  }

  // Authorization check: Member must be either the document uploader or the article author
  const isUploader = document.uploaded_by_member_id === member.id;
  const isArticleAuthor =
    document.article.discussion_board_member_id === member.id;

  if (!isUploader && !isArticleAuthor) {
    throw new HttpException(
      "Unauthorized: You can only delete your own documents or documents from your articles",
      403,
    );
  }

  // Soft delete the document by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_article_documents.update({
    where: { id: documentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
