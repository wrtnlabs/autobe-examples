import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";

export async function getEconomicBoardSettingsCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<IEconomicBoardCategory> {
  const category = await MyGlobal.prisma.economic_board_categories.findUnique({
    where: { code: props.categoryCode },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return category.code;
}
