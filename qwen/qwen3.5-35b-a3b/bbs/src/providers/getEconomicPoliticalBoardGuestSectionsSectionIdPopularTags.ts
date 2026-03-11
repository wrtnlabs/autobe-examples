import { IEconomicPoliticalBoardSectionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionPopularTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardGuestSectionsSectionIdPopularTags(props: {
  guest: GuestPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardSectionPopularTag.ISummary[]> {
  await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId as string,
      deleted_at: null,
    },
  });
  const sectionIdStr = props.sectionId as string;
  const popularTags = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      tag_name: string;
      article_count: number;
    }>
  >(`SELECT t.name AS tag_name, COUNT(at.article_id) AS article_count
    FROM economic_political_board_tags t
    INNER JOIN economic_political_board_article_tags at ON t.id = at.tag_id
    INNER JOIN economic_political_board_articles a ON at.article_id = a.id
    WHERE a.section_id = ${sectionIdStr}
      AND a.deleted_at IS NULL
      AND t.deleted_at IS NULL
    GROUP BY t.id, t.name
    ORDER BY article_count DESC`);
  return popularTags.map((tag) => ({
    tagName: tag.tag_name,
    articleCount: tag.article_count,
  }));
}
