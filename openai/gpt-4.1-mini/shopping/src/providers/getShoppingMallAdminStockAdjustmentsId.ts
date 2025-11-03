import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminStockAdjustmentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallStockAdjustment> {
  // Destructure props
  const { admin, id } = props;
  // Find the stock adjustment record by id, ensuring it exists
  const record =
    await MyGlobal.prisma.shopping_mall_stock_adjustments.findUnique({
      where: { id },
    });
  if (record === null) {
    throw new HttpException("Stock adjustment not found", 404);
  }
  // Map the Prisma record to the IShoppingMallStockAdjustment interface
  return {
    id: record.id,
    shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
    adjustment_type: typia.assert<
      "addition" | "subtraction" | "reservation" | "release"
    >(record.adjustment_type),
    quantity: record.quantity,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      record.actor_type,
    ),
    actor_id: record.actor_id,
    created_at: toISOStringSafe(record.created_at),
  };
}
