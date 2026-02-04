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
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";

export async function postShoppingMallAdminInventoryRecords(props: {
  admin: AdminPayload;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // Validate restock/adjustment logic
  if (props.body.sourceType === "restock" && props.body.quantityChange <= 0) {
    throw new HttpException(
      "For restock events, quantityChange must be positive.",
      400,
    );
  }
  if (
    props.body.sourceType === "adjustment" &&
    props.body.quantityChange >= 0
  ) {
    throw new HttpException(
      "For adjustment events, quantityChange must be negative.",
      400,
    );
  }
  // Use collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
    }),
    select: {
      quantity_change: true,
    },
  });
  // Return summary type as specified by IShoppingMallInventoryRecord
  // This is a workaround for the API contract inconsistency where an entity is created
  // but a summary type is returned. We return the single event as if it were a summary.
  return {
    totalQuantityChange: created.quantity_change,
    transactionCount: 1,
    averageChange: created.quantity_change,
  };
}
