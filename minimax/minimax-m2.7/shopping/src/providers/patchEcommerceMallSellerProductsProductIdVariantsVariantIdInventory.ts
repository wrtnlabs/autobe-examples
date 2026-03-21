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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Validate variant exists and belongs to seller's product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
      },
    });
  // Verify productId matches
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Verify product belongs to seller (ownership check)
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: For 'adjust' operation, verify adjustment doesn't exceed current stock
  if (props.body.operation === "adjust") {
    const currentStock =
      await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
        where: { ecommerce_mall_product_variant_id: props.variantId },
        _sum: { quantity_change: true },
      });
    const currentQuantity = currentStock._sum.quantity_change ?? 0;
    if (props.body.quantity > currentQuantity) {
      throw new HttpException(
        `Adjustment quantity (${props.body.quantity}) exceeds current stock (${currentQuantity})`,
        400,
      );
    }
  }
  // Step 3: Create inventory record using collector
  const created = await MyGlobal.prisma.ecommerce_mall_inventory_records.create(
    {
      data: await EcommerceMallInventoryRecordCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: props.variantId },
      }),
      ...EcommerceMallInventoryRecordTransformer.select(),
    },
  );
  // Step 4: Calculate new calculated_stock_quantity (sum of all records for variant)
  const newStock =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const calculatedStock = (newStock._sum.quantity_change ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  // Step 5: Return transformed response with calculated stock
  const response =
    await EcommerceMallInventoryRecordTransformer.transform(created);
  return {
    ...response,
    calculated_stock_quantity: calculatedStock,
  };
}
