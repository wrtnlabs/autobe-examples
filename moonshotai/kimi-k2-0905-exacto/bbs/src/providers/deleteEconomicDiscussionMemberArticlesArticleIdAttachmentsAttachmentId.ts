import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string;
  attachmentId: string;
}): Promise<void> {
  // First, check if the article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId as string & tags.Format<"uuid"> },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check if the attachment exists
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.findUnique({
      where: { id: props.attachmentId as string & tags.Format<"uuid"> },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Verify the attachment belongs to the specified article
  if (attachment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException("Attachment does not belong to this article", 403);
  }

  // Check authorization - member must own the article
  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only delete attachments from your own articles",
      403,
    );
  }

  // Delete the attachment
  await MyGlobal.prisma.economic_discussion_attachments.delete({
    where: { id: props.attachmentId as string & tags.Format<"uuid"> },
  });
  // Note: File storage cleanup would be handled in a separate service/utility
}
