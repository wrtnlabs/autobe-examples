import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
    },
    select: { id: true },
  });
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirstOrThrow({
      where: {
        id: props.inventoryRecordId,
        shopping_mall_product_variant_id: props.variantId,
      },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(
    inventoryRecord,
  );
}
