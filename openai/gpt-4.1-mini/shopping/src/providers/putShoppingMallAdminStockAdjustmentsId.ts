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

export async function putShoppingMallAdminStockAdjustmentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallStockAdjustment.IUpdate;
}): Promise<IShoppingMallStockAdjustment> {
  const { admin, id, body } = props;

  // Check if stock adjustment exists and is not deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_stock_adjustments.findUnique({
      where: { id },
    });
  if (!existing) {
    throw new HttpException(`Stock adjustment with id ${id} not found`, 404);
  }

  // Verify product SKU exists
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: body.shopping_mall_product_sku_id },
  });
  if (!sku) {
    throw new HttpException(
      `Product SKU with id ${body.shopping_mall_product_sku_id} not found`,
      404,
    );
  }

  // Proceed with update
  const updated = await MyGlobal.prisma.shopping_mall_stock_adjustments.update({
    where: { id },
    data: {
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      adjustment_type: body.adjustment_type,
      quantity: body.quantity,
      actor_type: body.actor_type,
      actor_id: body.actor_id,
    },
  });

  // Return with correct casting to literal types
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    adjustment_type: typia.assert<
      "addition" | "subtraction" | "reservation" | "release"
    >(updated.adjustment_type),
    quantity: updated.quantity,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      updated.actor_type,
    ),
    actor_id: updated.actor_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}
