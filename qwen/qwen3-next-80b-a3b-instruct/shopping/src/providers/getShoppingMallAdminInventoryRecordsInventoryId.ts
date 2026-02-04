import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventoryRecordsInventoryId(props: {
  admin: AdminPayload;
  inventoryId: string;
}): Promise<IShoppingMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { id: props.inventoryId },
    });
  if (!record) {
    throw new HttpException("Inventory record not found", 404);
  }
  return {
    totalQuantityChange: record.quantity_change,
    transactionCount: 1,
    averageChange: record.quantity_change,
  };
}
