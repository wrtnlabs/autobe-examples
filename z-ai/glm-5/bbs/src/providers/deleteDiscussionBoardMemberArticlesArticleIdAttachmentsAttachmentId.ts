import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate article exists and is not deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, member_id: true, deleted_at: true },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Step 2: Validate attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUniqueOrThrow(
      {
        where: { id: props.attachmentId },
        select: { id: true, discussion_board_article_id: true },
      },
    );
  if (attachment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Attachment not found", 404);
  }
  // Step 3: Authorization - only article author can delete attachments
  if (article.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Delete the attachment record
  await MyGlobal.prisma.discussion_board_article_attachments.delete({
    where: { id: props.attachmentId },
  });
}
