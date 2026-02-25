import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardSection> {
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, is_deleted: false },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        author: {
          select: { id: true, display_name: true },
        },
        articleTags: {
          select: { tag: true },
        },
        attachments: {
          select: {
            id: true,
            file_url: true,
            file_name: true,
            file_type: true,
            file_size: true,
            created_at: true,
          },
        },
      },
    });
  const section = article.section;
  // Return only the section object as required by the function signature
  return {
    id: section.id,
    name: section.name,
    description: section.description,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at: section.deleted_at ? toISOStringSafe(section.deleted_at) : null,
  } satisfies IEconomicBoardSection;
}
