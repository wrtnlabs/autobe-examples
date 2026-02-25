import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerInventoryHistories(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  // 1. Validate variant belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.variant_id },
      select: { shopping_mall_product_id: true },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Check inventory balance if deduction
  if (props.body.quantity_change < 0) {
    const stockRecord =
      await MyGlobal.prisma.shopping_mall_variant_stocks.findUnique({
        where: {
          product_variant_id: props.body.variant_id,
        },
        select: { current_quantity: true },
      });
    const currentStock = stockRecord?.current_quantity ?? 0;
    if (currentStock + props.body.quantity_change < 0) {
      throw new HttpException("Insufficient stock", 400);
    }
  }
  // 3. Create inventory history record
  const history =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: props.body.variant_id,
        shopping_mall_seller_id: props.seller.id,
        quantity_change: props.body.quantity_change,
        reason: props.body.reason,
        created_at: new Date(),
        metadata: props.body.metadata ?? null,
      },
    });
  // 4. Update variant stocks
  await MyGlobal.prisma.shopping_mall_variant_stocks.upsert({
    where: {
      product_variant_id: props.body.variant_id,
    },
    create: {
      id: v4(),
      product_variant_id: props.body.variant_id,
      current_quantity: props.body.quantity_change,
      created_at: new Date(),
      updated_at: new Date(),
    },
    update: {
      current_quantity: { increment: props.body.quantity_change },
      updated_at: new Date(),
    },
  });
  // 5. Return transformed result
  const result =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findUniqueOrThrow({
      where: { id: history.id },
    });
  // Transform Prisma result to API interface
  return {
    reason: [result.reason],
    created_at_start: result.created_at.toISOString(),
    created_at_end: result.created_at.toISOString(),
    variant_id: result.shopping_mall_product_variant_id,
    order_item_id: result.shopping_mall_order_item_id ?? undefined,
    seller_id: result.shopping_mall_seller_id ?? undefined,
    search: result.metadata ?? undefined,
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  };
}
