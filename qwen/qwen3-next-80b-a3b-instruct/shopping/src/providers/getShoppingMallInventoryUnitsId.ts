import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";

export async function getShoppingMallInventoryUnitsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryUnit> {
  const unit = await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
    where: { id: props.id },
  });

  if (!unit) {
    throw new HttpException("Inventory unit not found", 404);
  }

  return unit.id;
}
