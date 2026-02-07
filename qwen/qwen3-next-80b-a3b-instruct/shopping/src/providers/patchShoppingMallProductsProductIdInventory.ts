import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductInventorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInventorySummary";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductInventorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventorySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdInventory(props: {
  productId: string;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProductInventorySummary> {
  const page = 1; // IRequest does not have page, use default
  const limit = 100; // IRequest does not have limit, use default
  const skip = (page - 1) * limit;
  // Find all variants for the given product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        option_values: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Get variant IDs for stock calculation
  const variantIds = variants.map((v) => v.id);
  // Calculate total stock for each variant by summing all quantity_change records
  const variantStocks =
    await MyGlobal.prisma.shopping_mall_inventory_histories.groupBy({
      by: ["shopping_mall_product_variant_id"],
      where: {
        shopping_mall_product_variant_id: { in: variantIds },
      },
      _sum: {
        quantity_change: true,
      },
    });
  // Map variant data with calculated stock
  const inventorySummaries = variants.map((variant) => {
    const stockRecord = variantStocks.find(
      (v) => v.shopping_mall_product_variant_id === variant.id,
    );
    const totalStock = stockRecord ? stockRecord._sum.quantity_change : 0;
    return {
      variant_id: variant.id,
      sku: variant.sku,
      option_values: variant.option_values,
      stock: totalStock,
    };
  });
  // Count total variants for pagination
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
  });
  return {
    data: inventorySummaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
