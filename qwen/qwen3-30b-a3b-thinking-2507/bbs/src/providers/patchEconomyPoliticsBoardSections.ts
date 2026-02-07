import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardSections(props: {
  body: IEconomyPoliticsBoardSection.IRequest;
}): Promise<IPageIEconomyPoliticsBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    name: { not: null },
    ...(props.body.search && {
      OR: [
        {
          name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };
  const data = await MyGlobal.prisma.economy_politics_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.economy_politics_board_sections.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, (section) => ({
    id: section.id,
    name: section.name,
    description: section.description,
    created_at: toISOStringSafe(section.created_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
