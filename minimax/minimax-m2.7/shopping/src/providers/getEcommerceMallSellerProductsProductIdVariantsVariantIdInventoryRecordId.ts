import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdVariantsVariantIdInventoryRecordId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Validate that the product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  // Step 2: Verify seller owns this product
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate that the variant belongs to the specified product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Query the inventory record by recordId with variant data
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.recordId },
      ...EcommerceMallInventoryRecordTransformer.select(),
    });
  // Step 5: Validate that the inventory record belongs to the specified variant
  if (record.productVariant.id !== props.variantId) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 6: Calculate current stock quantity by summing all quantity_change values for the variant
  const aggregatedStock =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const calculatedStockQuantity = aggregatedStock._sum.quantity_change ?? 0;
  // Step 7: Transform and return the inventory record
  const transformed =
    await EcommerceMallInventoryRecordTransformer.transform(record);
  return {
    ...transformed,
    calculated_stock_quantity: calculatedStockQuantity as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
