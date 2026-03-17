import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function postShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      suspended: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.quantity_change === 0) {
    throw new HttpException("Quantity change must not be zero", 400);
  }
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
      },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to the product", 400);
  }
  const created = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
      productVariant: {
        id: variant.id,
      },
    }),
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  return await ShoppingMallInventoryRecordTransformer.transform(created);
}
