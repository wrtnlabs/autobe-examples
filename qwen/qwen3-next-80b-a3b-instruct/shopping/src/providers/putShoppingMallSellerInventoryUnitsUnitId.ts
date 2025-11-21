import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerInventoryUnitsUnitId(props: {
  seller: SellerPayload;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryUnit.IUpdate;
}): Promise<IShoppingMallInventoryUnit> {
  const existing =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: props.unitId },
    });

  if (!existing) {
    throw new HttpException("Inventory unit not found", 404);
  }

  if (existing.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You do not own this inventory unit",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_inventory_units.update({
    where: { id: props.unitId },
    data: {
      quantity:
        props.body.quantity !== undefined
          ? props.body.quantity
          : existing.quantity,
      min_stock_threshold:
        props.body.min_stock_threshold !== undefined
          ? props.body.min_stock_threshold
          : existing.min_stock_threshold,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    product_variant_id: updated.product_variant_id,
    seller_id: updated.seller_id,
    quantity: updated.quantity,
    min_stock_threshold: updated.min_stock_threshold,
    last_updated: updated.last_updated
      ? toISOStringSafe(updated.last_updated)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  } satisfies IShoppingMallInventoryUnit as IShoppingMallInventoryUnit;
}
