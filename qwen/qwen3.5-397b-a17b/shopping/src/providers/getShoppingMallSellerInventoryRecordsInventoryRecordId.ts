import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function getShoppingMallSellerInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        product_variant_id: true,
      },
    });
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: record.product_variant_id },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        created_at: true,
        shopping_mall_product_id: true,
      },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: {
        id: true,
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    productVariant: {
      id: variant.id,
      sku_code: variant.sku_code,
      price_override: variant.price_override,
      product: typia.assert<IShoppingMallProduct.ISummary>({ id: product.id }),
      created_at: toISOStringSafe(variant.created_at),
    } satisfies IShoppingMallProductVariant.ISummary,
    quantity_change: record.quantity_change,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
  } satisfies IShoppingMallInventoryRecord;
}
