import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardTags(props: {
  body: IEconomicPoliticalBoardTag.IRequest;
}): Promise<IPageIEconomicPoliticalBoardTag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereClause: Prisma.economic_political_board_tagsWhereInput = {
    deleted_at: null,
    ...(props.body.name !== undefined
      ? {
          name: {
            contains: props.body.name,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.economic_political_board_tagsWhereInput;
  const [tagData, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_tags
      .findMany({
        where: whereClause,
        orderBy:
          props.body.sort === "count"
            ? [{ articleTags: { _count: "desc" } }, { name: "asc" }]
            : [{ name: "asc" }],
        skip,
        take: limit,
        include: {
          articleTags: {
            select: { id: true },
          },
        },
      })
      .then((tagList) =>
        tagList.map((tag) => ({
          ...tag,
          article_count: tag.articleTags.length,
        })),
      ),
    MyGlobal.prisma.economic_political_board_tags.count({
      where: whereClause,
    }),
  ]);
  const data: IEconomicPoliticalBoardTag.ISummary[] = tagData.map((tag) => ({
    id: tag.id,
    name: tag.name,
    article_count: tag.article_count,
    created_at: toISOStringSafe(tag.created_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
