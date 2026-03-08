import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAttachmentCollector } from "../collectors/DiscussionBoardArticleAttachmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleAttachmentTransformer } from "../transformers/DiscussionBoardArticleAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  // 1. Article validation - check exists and not deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, member_id: true, deleted_at: true },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // 2. Authorization - member must own the article
  if (article.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Attachment count check (max 10)
  const existingCount =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: { discussion_board_article_id: props.articleId },
    });
  if (existingCount >= 10) {
    throw new HttpException("Maximum 10 attachments per article", 400);
  }
  // 4. Total size check (max 50MB = 52,428,800 bytes)
  const totalSize =
    await MyGlobal.prisma.discussion_board_article_attachments.aggregate({
      where: { discussion_board_article_id: props.articleId },
      _sum: { size: true },
    });
  const currentTotal = totalSize._sum.size ?? 0;
  if (currentTotal + props.body.size > 52428800) {
    throw new HttpException("Total attachment size exceeds 50MB limit", 400);
  }
  // 5. File size validation
  const FILE_MAX = 20971520; // 20MB
  const IMAGE_MAX = 10485760; // 10MB
  if (props.body.type === "file" && props.body.size > FILE_MAX) {
    throw new HttpException("File size exceeds 20MB limit", 400);
  }
  if (props.body.type === "image" && props.body.size > IMAGE_MAX) {
    throw new HttpException("Image size exceeds 10MB limit", 400);
  }
  // 6. Extension validation
  const validFileExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
  ];
  const validImageExtensions = ["jpeg", "jpg", "png", "gif", "webp"];
  const ext = props.body.extension.toLowerCase();
  if (props.body.type === "file" && !validFileExtensions.includes(ext)) {
    throw new HttpException("Invalid file extension", 400);
  }
  if (props.body.type === "image" && !validImageExtensions.includes(ext)) {
    throw new HttpException("Invalid image extension", 400);
  }
  // 7. Create attachment using collector
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: await DiscussionBoardArticleAttachmentCollector.collect({
        body: props.body,
        discussionBoardArticles: { id: props.articleId },
      }),
      ...DiscussionBoardArticleAttachmentTransformer.select(),
    });
  return await DiscussionBoardArticleAttachmentTransformer.transform(created);
}
