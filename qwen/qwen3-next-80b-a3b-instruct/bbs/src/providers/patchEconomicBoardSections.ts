import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSections(props: {
  body: IEconomicBoardSection.IRequest;
}): Promise<IPageIEconomicBoardSection.ISummary> {
  const whereInput = {
    status: "active",
    deleted_at: null,
  } satisfies Prisma.economic_board_sectionsWhereInput;
  const data = await MyGlobal.prisma.economic_board_sections.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.economic_board_sections.count({
    where: whereInput,
  });
  return {
    data: data.map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description,
      created_at: toISOStringSafe(section.created_at),
    })),
    pagination: {
      current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / 100) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
