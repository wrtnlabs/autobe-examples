import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";

export async function getShoppingMallInventoryUnitsUnitId(props: {
  unitId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryUnit> {
  const inventoryUnit =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: props.unitId },
    });

  if (!inventoryUnit) {
    throw new HttpException("Inventory unit not found", 404);
  }

  return inventoryUnit.id;
}
