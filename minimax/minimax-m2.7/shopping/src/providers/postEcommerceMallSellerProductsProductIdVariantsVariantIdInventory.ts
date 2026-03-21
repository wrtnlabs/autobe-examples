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
import { EcommerceMallInventoryRecordCollector } from "../collectors/EcommerceMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Verify product exists and belongs to the requesting seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists and belongs to the specified product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        quantity: true,
      },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  // Step 3: For adjustments, verify current stock >= adjustment quantity
  if (
    props.body.operation === "adjust" &&
    variant.quantity < props.body.quantity
  ) {
    throw new HttpException(
      `Insufficient stock for adjustment. Current stock: ${variant.quantity}, requested: ${props.body.quantity}`,
      400,
    );
  }
  // Step 4: Calculate quantity change based on operation type
  const quantityChange: number =
    props.body.operation === "restock"
      ? props.body.quantity
      : -props.body.quantity;
  // Step 5: Create inventory record using collector
  const createdRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: await EcommerceMallInventoryRecordCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: props.variantId } as IEntity,
      }),
      ...EcommerceMallInventoryRecordTransformer.select(),
    });
  // Step 6: Update variant's quantity
  const newQuantity = variant.quantity + quantityChange;
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { quantity: newQuantity },
  });
  // Step 7: Calculate total stock from all inventory records for this variant
  const aggregatedStock =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const calculatedStockQuantity = aggregatedStock._sum.quantity_change ?? 0;
  // Step 8: Fetch variant details for response using transformer
  const variantWithDetails =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  // Step 9: Build and return the response
  return {
    id: createdRecord.id,
    quantity_change: createdRecord.quantity_change,
    reason: createdRecord.reason,
    created_at: createdRecord.created_at.toISOString(),
    variant:
      await EcommerceMallProductVariantAtSummaryTransformer.transform(
        variantWithDetails,
      ),
    calculated_stock_quantity: calculatedStockQuantity,
  };
}
