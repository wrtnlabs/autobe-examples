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

export async function postShoppingMallAdminStockAdjustments(props: {
  admin: AdminPayload;
  body: IShoppingMallStockAdjustment.ICreate;
}): Promise<IShoppingMallStockAdjustment> {
  const { admin, body } = props;

  // Confirm the referenced product SKU exists
  await MyGlobal.prisma.shopping_mall_product_skus.findUniqueOrThrow({
    where: { id: body.shopping_mall_product_sku_id },
  });

  // Prepare creation timestamp as ISO string
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Generate new UUID for the stock adjustment record
  const id: string & tags.Format<"uuid"> = v4();

  // Create the stock adjustment record
  const created = await MyGlobal.prisma.shopping_mall_stock_adjustments.create({
    data: {
      id,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      adjustment_type: body.adjustment_type,
      quantity: body.quantity,
      actor_type: body.actor_type,
      actor_id: body.actor_id,
      created_at,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    adjustment_type: typia.assert<
      "addition" | "subtraction" | "reservation" | "release"
    >(created.adjustment_type),
    quantity: created.quantity,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      created.actor_type,
    ),
    actor_id: created.actor_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
