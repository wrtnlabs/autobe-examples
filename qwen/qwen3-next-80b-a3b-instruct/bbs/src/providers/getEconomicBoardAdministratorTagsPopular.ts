import { IEconomicBoardSearchTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchTag";
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

export async function getEconomicBoardAdministratorTagsPopular(props: {
  administrator: AdministratorPayload;
}): Promise<IEconomicBoardSearchTag[]> {
  const tags =
    await MyGlobal.prisma.economic_board_search_article_tags.findMany({
      select: {
        tag: {
          select: {
            text: true,
          },
        },
      },
      where: {
        article: {
          deleted_at: null,
        },
      },
    });
  const tagCounts = tags.reduce(
    (acc, item) => {
      const text = item.tag?.text || "";
      acc[text] = (acc[text] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const result = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([text, count]) => ({
      text,
      count,
    }));
  return result;
}
