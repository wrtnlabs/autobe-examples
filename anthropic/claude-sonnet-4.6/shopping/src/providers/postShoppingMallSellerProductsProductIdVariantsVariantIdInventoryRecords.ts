import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // 1. Verify product exists and belongs to authenticated seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException(
      "Forbidden: product not found or not owned by seller",
      403,
    );
  }
  // 2. Verify variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException(
      "Not Found: variant not found or not belonging to this product",
      404,
    );
  }
  // 3. Validate quantity is non-zero
  if (props.body.quantity === 0) {
    throw new HttpException("Bad Request: quantity must be non-zero", 400);
  }
  // 4. Validate note is non-empty (required for manual records)
  const note = props.body.note ?? null;
  if (note === null || note.length === 0) {
    throw new HttpException(
      "Bad Request: note is required and must be non-empty",
      400,
    );
  }
  // 5. Stock floor check for negative adjustments
  if (props.body.quantity < 0) {
    const aggregate =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { shopping_mall_product_variant_id: props.variantId },
        _sum: { quantity: true },
      });
    const currentStock = aggregate._sum.quantity ?? 0;
    if (currentStock + props.body.quantity < 0) {
      throw new HttpException(
        "Unprocessable Entity: adjustment would bring stock below zero",
        422,
      );
    }
  }
  // 6. Create the inventory record using the collector + transformer
  const created = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
      shoppingMallProductVariants: { id: props.variantId },
      shoppingMallSellers: { id: props.seller.id },
      shoppingMallSellerSessions: { id: props.seller.session_id },
    }),
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  // 7. Transform and return
  return ShoppingMallInventoryRecordTransformer.transform(created);
}
