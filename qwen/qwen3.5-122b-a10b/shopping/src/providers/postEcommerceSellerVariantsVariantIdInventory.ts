import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceInventoryRecordCollector } from "../collectors/EcommerceInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceInventoryRecordTransformer } from "../transformers/EcommerceInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceInventoryRecord.ICreate;
}): Promise<IEcommerceInventoryRecord> {
  // Verify variant exists
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true },
    });
  // Verify product belongs to seller
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: variant.product_id },
    select: { id: true, seller_id: true },
  });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business rule: quantity_change must not be zero
  if (props.body.quantity_change === 0) {
    throw new HttpException("Quantity change must not be zero", 400);
  }
  // Create inventory record using collector
  const record = await MyGlobal.prisma.ecommerce_inventory_records.create({
    data: await EcommerceInventoryRecordCollector.collect({
      body: props.body,
      ecommerceProductVariants: variant,
    }),
    ...EcommerceInventoryRecordTransformer.select(),
  });
  return await EcommerceInventoryRecordTransformer.transform(record);
}
