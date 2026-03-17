import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminVariantsVariantIdInventoryRecordsRecordId(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  // Step 1: Verify the product variant exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
    select: { id: true },
  });
  // Step 2: Find the inventory record scoped to the variant (404 if not found or wrong variant)
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirstOrThrow({
      where: {
        id: props.recordId,
        shopping_mall_product_variant_id: props.variantId,
      },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  // Step 3: Transform and return the DTO
  return ShoppingMallInventoryRecordTransformer.transform(record);
}
