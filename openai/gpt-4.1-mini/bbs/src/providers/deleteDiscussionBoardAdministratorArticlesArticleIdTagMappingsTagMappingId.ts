import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorArticlesArticleIdTagMappingsTagMappingId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  tagMappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const tagMapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findFirst({
      where: {
        id: props.tagMappingId,
        discussion_board_article_id: props.articleId,
      },
    });
  if (tagMapping === null) {
    throw new HttpException("Tag mapping not found", 404);
  }
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_article_tag_mappings.delete({
      where: { id: props.tagMappingId },
    });
    await tx.discussion_board_section_admin_logs.create({
      data: {
        id: v4(),
        administrator_id: props.administrator.id,
        section_id: article.section_id,
        action_type: "delete",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
