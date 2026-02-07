import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminAnalyticsInventory(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAction.IRequest;
}): Promise<IPageIShoppingMallAdminAction.ISummary> {
  // Build WHERE conditions for inventory_histories - no filtering criteria from body since IRequest is empty
  const where: Prisma.shopping_mall_inventory_historiesWhereInput = {};
  // Fetch all inventory records with variant and product info in one query
  const inventoryRecords =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
      where,
      include: {
        variant: {
          select: {
            product_id: true,
            seller_id: true,
            stock: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });
  // Extract distinct products that appeared in inventory changes
  const productMap = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      stock: number;
    }
  >();
  // Map variants to products
  inventoryRecords.forEach((record) => {
    const variant = record.variant;
    if (variant) {
      productMap.set(variant.product_id, {
        id: variant.product_id,
        name: variant.product.name,
        category: "Unknown",
        stock: variant.stock || 0,
      });
    }
  });
  // Group inventory changes by product and calculate sales/restocks
  const productAggregations = new Map<
    string,
    {
      total_sold: number;
      total_restocks: number;
    }
  >();
  inventoryRecords.forEach((record) => {
    const productId = record.variant?.product_id;
    if (!productId) return;
    if (!productAggregations.has(productId)) {
      productAggregations.set(productId, { total_sold: 0, total_restocks: 0 });
    }
    const agg = productAggregations.get(productId);
    if (agg) {
      if (record.quantity_change > 0) {
        agg.total_restocks += record.quantity_change;
      } else {
        agg.total_sold += -record.quantity_change;
      }
    }
  });
  // Calculate category-level aggregations (Virtual 'All Products' category)
  const virtualCategorySummary = {
    category_name: "All Products",
    total_stock:
      productMap.size > 0
        ? Array.from(productMap.values()).reduce((sum, p) => sum + p.stock, 0)
        : 0,
    total_sold:
      productAggregations.size > 0
        ? Array.from(productAggregations.values()).reduce(
            (sum, agg) => sum + agg.total_sold,
            0,
          )
        : 0,
    total_restocks:
      productAggregations.size > 0
        ? Array.from(productAggregations.values()).reduce(
            (sum, agg) => sum + agg.total_restocks,
            0,
          )
        : 0,
    out_of_stock_percentage:
      productMap.size > 0
        ? (Array.from(productMap.values()).filter((p) => p.stock === 0).length /
            productMap.size) *
          100
        : 0,
    product_count: productMap.size,
  };
  // Create single item array with virtual category summary
  const summaryArray = [virtualCategorySummary];
  // Use system's default cursor-based pagination - no custom cursor or limit in body
  // System automatically handles pagination via cursor parameter in request
  // But since IRequest is empty, we use the default pagination values as defined in IPage.IPagination
  const page = 1;
  const limit = 100;
  const startIndex = 0;
  const endIndex = Math.min(startIndex + limit, summaryArray.length);
  const data = summaryArray.slice(startIndex, endIndex);
  // Return paginated result
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: summaryArray.length,
      pages: Math.ceil(summaryArray.length / limit),
    } satisfies IPage.IPagination,
  };
}
