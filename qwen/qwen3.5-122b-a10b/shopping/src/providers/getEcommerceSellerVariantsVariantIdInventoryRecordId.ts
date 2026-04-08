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

export async function getEcommerceSellerVariantsVariantIdInventoryRecordId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceInventoryRecord> {
  const record =
    await MyGlobal.prisma.ecommerce_inventory_records.findFirstOrThrow({
      where: {
        id: props.recordId,
        ecommerce_product_variant_id: props.variantId,
        deleted_at: null,
        productVariant: {
          product: {
            seller_id: props.seller.id,
            deleted_at: null,
          },
        },
      },
      ...EcommerceInventoryRecordTransformer.select(),
    } satisfies Prisma.ecommerce_inventory_recordsFindUniqueOrThrowArgs);
  return await EcommerceInventoryRecordTransformer.transform(record);
}
