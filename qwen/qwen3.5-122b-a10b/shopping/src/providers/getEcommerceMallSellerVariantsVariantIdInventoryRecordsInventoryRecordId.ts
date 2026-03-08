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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  // Validate variant exists and belongs to authenticated seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        product: {
          seller: {
            id: props.seller.id,
          },
        },
      },
      select: { id: true },
    });
  // Validate inventory record exists, belongs to the variant, and is not soft-deleted
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: {
        id: props.inventoryRecordId,
        ecommerce_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      ...EcommerceMallInventoryRecordTransformer.select(),
    });
  return await EcommerceMallInventoryRecordTransformer.transform(record);
}
