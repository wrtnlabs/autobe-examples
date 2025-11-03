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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdDocuments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDocument.ICreate;
}): Promise<IDiscussionBoardArticleDocument> {
  const { member, articleId, body } = props;

  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
    });

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only add documents to your own articles",
      403,
    );
  }

  const existingDocumentsCount =
    await MyGlobal.prisma.discussion_board_article_documents.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (existingDocumentsCount >= 5) {
    throw new HttpException(
      "Maximum of 5 document attachments per article exceeded",
      400,
    );
  }

  const existingDocuments =
    await MyGlobal.prisma.discussion_board_article_documents.findMany({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      select: {
        size_bytes: true,
      },
    });

  const existingImages =
    await MyGlobal.prisma.discussion_board_article_images.findMany({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      select: {
        size_bytes: true,
      },
    });

  const totalExistingSize =
    existingDocuments.reduce((sum, doc) => sum + doc.size_bytes, 0) +
    existingImages.reduce((sum, img) => sum + img.size_bytes, 0);

  const totalSizeAfterUpload = totalExistingSize + body.size_bytes;
  const maxTotalSize = 104857600;

  if (totalSizeAfterUpload > maxTotalSize) {
    throw new HttpException(
      `Total attachment size limit of 100MB would be exceeded. Current: ${totalExistingSize} bytes, attempting to add: ${body.size_bytes} bytes`,
      400,
    );
  }

  const extensionMatch = body.original_name.match(/\\.([^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "bin";
  const stored_name = `${v4()}.${extension}`;

  const now = toISOStringSafe(new Date());
  const documentId = v4();

  const created =
    await MyGlobal.prisma.discussion_board_article_documents.create({
      data: {
        id: documentId,
        discussion_board_article_id: articleId,
        uploaded_by_member_id: member.id,
        original_name: body.original_name,
        stored_name: stored_name,
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        created_at: now,
      },
    });

  const uploader =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
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
    deleted_at: undefined,
    uploader: {
      id: uploader.id,
      username: uploader.username,
      display_name: uploader.display_name ?? undefined,
      profile_picture_url: uploader.profile_picture_url ?? undefined,
    },
  };
}
