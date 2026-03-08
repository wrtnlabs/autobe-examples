import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerVariantsVariantIdStock(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant.IStock> {
  // Query variant with inventory records for stock calculation
  // Must exclude soft-deleted variants (deleted_at: null)
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
    });
  // Calculate stock quantity by summing all inventory record changes
  const stockQuantity = variant.inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  // Derive availability status
  const availability = stockQuantity > 0 ? "in_stock" : "out_of_stock";
  return {
    id: variant.id,
    skuCode: variant.sku_code,
    optionValues: JSON.parse(variant.option_values),
    stockQuantity,
    availability,
  } satisfies IShoppingMallProductVariant.IStock;
}
