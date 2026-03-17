import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function postEcommerceMallSellerVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Verify variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true, deleted_at: true },
    });
  // Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: variant.ecommerce_mall_product_id },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business validation: quantityChange must be non-zero
  if (props.body.quantityChange === 0) {
    throw new HttpException("Quantity change must be non-zero", 400);
  }
  // Business validation: reason must be non-empty
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Reason must be non-empty", 400);
  }
  // Collect inventory record data with current stock calculation
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: await EcommerceMallInventoryRecordCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: variant,
      }),
      ...EcommerceMallInventoryRecordTransformer.select(),
    });
  return await EcommerceMallInventoryRecordTransformer.transform(
    inventoryRecord,
  );
}
