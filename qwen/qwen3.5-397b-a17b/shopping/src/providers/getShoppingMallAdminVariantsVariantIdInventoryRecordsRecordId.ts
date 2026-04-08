import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirstOrThrow({
      where: {
        id: props.recordId,
        shopping_mall_product_variant_id: props.variantId,
      },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(record);
}
