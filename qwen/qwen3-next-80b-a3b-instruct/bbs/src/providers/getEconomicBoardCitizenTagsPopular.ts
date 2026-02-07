import { IEconomicBoardSearchTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardCitizenTagsPopular(props: {
  citizen: CitizenPayload;
}): Promise<IEconomicBoardSearchTag[]> {
  const popularTags =
    await MyGlobal.prisma.economic_board_search_article_tags.groupBy({
      by: ["tag_id"],
      _count: { tag_id: true },
      orderBy: { _count: { tag_id: "desc" } },
      take: 20,
    });
  const tagIds = popularTags.map((t) => t.tag_id);
  const tagDetails = await MyGlobal.prisma.economic_board_search_tags.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, text: true },
  });
  const tagMap = new Map(tagDetails.map((t) => [t.id, t.text]));
  return popularTags.map((t) => ({
    text: tagMap.get(t.tag_id) || "",
    count: t._count.tag_id,
  }));
}
