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

export async function deleteEconomicPoliticalBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify article exists and get its author
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true, deleted_at: true },
    });
  // Step 2: Verify article is not already deleted
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Step 3: Verify member owns the article
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify attachment exists and belongs to this article
  const attachment =
    await MyGlobal.prisma.economic_political_board_attachments.findUniqueOrThrow(
      {
        where: {
          id: props.attachmentId,
          article_id: props.articleId,
        },
        select: { id: true },
      },
    );
  // Step 5: Soft delete the attachment
  await MyGlobal.prisma.economic_political_board_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
