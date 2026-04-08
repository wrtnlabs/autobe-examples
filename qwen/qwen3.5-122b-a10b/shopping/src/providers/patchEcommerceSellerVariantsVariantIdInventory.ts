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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceInventoryRecordTransformer } from "../transformers/EcommerceInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceInventoryRecord.IAdjust;
}): Promise<IEcommerceInventoryRecord> {
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      product: {
        seller_id: props.seller.id,
      },
      deleted_at: null,
    },
  });
  if (variant === null) {
    throw new HttpException("Variant not found or you don't own it", 404);
  }
  if (props.body.quantity_change === 0) {
    throw new HttpException("Quantity change cannot be zero", 400);
  }
  const record = await MyGlobal.prisma.ecommerce_inventory_records.create({
    data: {
      id: v4(),
      ecommerce_product_variant_id: props.variantId,
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceInventoryRecordTransformer.select(),
  });
  return await EcommerceInventoryRecordTransformer.transform(record);
}
