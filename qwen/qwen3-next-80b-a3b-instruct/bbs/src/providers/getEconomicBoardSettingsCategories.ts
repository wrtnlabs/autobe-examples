import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";

export async function getEconomicBoardSettingsCategories(): Promise<IPageIEconomicBoardCategory.ISummary> {
  const categories = await MyGlobal.prisma.economic_board_categories.findMany({
    orderBy: { created_at: "asc" },
  });

  return {
    pagination: {
      current: 1,
      limit: categories.length,
      records: categories.length,
      pages: 1,
    },
    data: categories.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      created_at: toISOStringSafe(category.created_at),
    })),
  };
}
