import { IEcommerceVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantInventory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceVariantInventoryTransformer } from "../transformers/EcommerceVariantInventoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerAnalyticsInventories(props: {
  seller: SellerPayload;
}): Promise<IEcommerceVariantInventory> {
  const products = await MyGlobal.prisma.ecommerce_products.findMany({
    where: {
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const productIds = products.map((p) => p.id);
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: {
      ecommerce_product_id: { in: productIds },
      deleted_at: null,
    },
    ...EcommerceVariantInventoryTransformer.select(),
  });
  let currentStock = 0;
  let adjustmentSummary: Record<string, number> = {};
  for (const variant of variants) {
    if (variant.inventories) {
      for (const inventory of variant.inventories) {
        currentStock += inventory.quantity;
        adjustmentSummary[inventory.reason] =
          (adjustmentSummary[inventory.reason] || 0) + 1;
      }
    }
  }
  return {
    sku: "all",
    currentStock,
    adjustmentSummary,
  };
}
