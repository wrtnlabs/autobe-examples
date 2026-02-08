import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductVariantsVariantIdInventoryHistories(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
    });
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  const quantityDelta = (props.body as any).quantity_delta;
  const reason = (props.body as any).reason;
  if (typeof quantityDelta !== "number" || quantityDelta === 0) {
    throw new HttpException("quantity_delta must be a non-zero integer", 400);
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new HttpException("reason must be a non-empty string", 400);
  }
  const data = await ShoppingMallInventoryHistoryCollector.collect({
    body: props.body,
    shoppingMallProductVariants: variant,
  });
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        ...data,
        quantity_delta: quantityDelta,
        reason: reason,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    quantity_delta: created.quantity_delta,
    reason: created.reason,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
