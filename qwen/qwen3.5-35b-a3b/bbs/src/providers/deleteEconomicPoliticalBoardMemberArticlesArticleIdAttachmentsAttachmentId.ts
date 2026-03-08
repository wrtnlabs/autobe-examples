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
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  const isOwner = article.author_id === props.member.id;
  if (!isOwner) {
    const adminRole =
      await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
        {
          where: { user_id: props.member.id },
        },
      );
    if (adminRole === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const attachment =
    await MyGlobal.prisma.economic_political_board_attachments.findFirstOrThrow(
      {
        where: {
          id: props.attachmentId,
          article_id: props.articleId,
          deleted_at: null,
        },
      },
    );
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.economic_political_board_attachments.update({
    where: { id: props.attachmentId },
    data: { deleted_at: now, updated_at: now },
  });
  await MyGlobal.prisma.economic_political_board_articles.update({
    where: { id: props.articleId },
    data: { updated_at: now },
  });
}
