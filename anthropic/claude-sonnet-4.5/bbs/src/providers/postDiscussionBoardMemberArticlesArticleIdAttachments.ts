import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Only the article author can add attachments", 403);
  }

  const existingAttachments =
    await MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });

  const imageCount = existingAttachments.filter(
    (a) => a.type === "image",
  ).length;
  const documentCount = existingAttachments.filter(
    (a) => a.type === "file",
  ).length;
  const totalSize = existingAttachments.reduce((sum, a) => sum + a.size, 0);

  if (props.body.type === "image" && imageCount >= 10) {
    throw new HttpException("Maximum 10 image attachments per article", 400);
  }

  if (props.body.type === "file" && documentCount >= 5) {
    throw new HttpException("Maximum 5 document attachments per article", 400);
  }

  if (totalSize + props.body.size > 25 * 1024 * 1024) {
    throw new HttpException(
      "Total attachment size exceeds 25MB limit for this article",
      400,
    );
  }

  const now = new Date();
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        discussion_board_member_id: props.member.id,
        type: props.body.type,
        format: props.body.format,
        size: props.body.size,
        original_filename: props.body.original_filename,
        storage_path: props.body.storage_path,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    discussion_board_member_id: created.discussion_board_member_id,
    type: created.type,
    format: created.format,
    size: created.size,
    original_filename: created.original_filename,
    storage_path: created.storage_path,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
