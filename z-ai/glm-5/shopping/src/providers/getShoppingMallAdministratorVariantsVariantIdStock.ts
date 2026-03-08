import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantStock";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorVariantsVariantIdStock(props: {
  administrator: AdministratorPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantStock> {
  // Find the variant, excluding soft-deleted ones
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Calculate stock quantity by summing all inventory records
  const stockResult =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: {
        variant_id: props.variantId,
      },
      _sum: {
        quantity_change: true,
      },
    });
  const stockQuantity = stockResult._sum.quantity_change ?? 0;
  // Determine availability status
  const availability: "in_stock" | "out_of_stock" =
    stockQuantity > 0 ? "in_stock" : "out_of_stock";
  // Parse option_values JSON string
  const optionValues: {
    [key: string]: string;
  } = JSON.parse(variant.option_values);
  return {
    id: variant.id,
    skuCode: variant.sku_code,
    optionValues: optionValues,
    stockQuantity: stockQuantity,
    availability: availability,
  } satisfies IShoppingMallProductVariantStock;
}
