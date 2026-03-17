import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function postEcommerceMallSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Verify variant exists and get product_id
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product_id: true,
      },
    });
  // Query product to verify seller ownership via FK column
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: variant.product_id },
      select: {
        id: true,
        seller_id: true,
      },
    });
  // Verify seller owns the variant
  if (product.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden - Seller does not own this variant",
      403,
    );
  }
  // Create inventory record using collector
  const created = await MyGlobal.prisma.ecommerce_mall_inventory_records.create(
    {
      data: await EcommerceMallInventoryRecordCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: variant.id },
      }),
      ...EcommerceMallInventoryRecordTransformer.select(),
    },
  );
  // Transform and return
  return await EcommerceMallInventoryRecordTransformer.transform(created);
}
