import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatus";
import { IShoppingMallProductInventoryStatusItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatusItem";
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

export async function patchShoppingMallSellerProductsInventoryStatus(props: {
  seller: SellerPayload;
  body: IShoppingMallProductInventoryStatus.IRequest;
}): Promise<IShoppingMallProductInventoryStatus> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for the subquery
  const whereConditions: string[] = [];
  const whereParams: any[] = [];
  if (props.body.category_id !== undefined) {
    whereConditions.push("p.category_id = $1");
    whereParams.push(props.body.category_id);
  }
  if (props.body.seller_id !== undefined) {
    whereConditions.push("p.seller_id = $" + (whereParams.length + 2));
    whereParams.push(props.body.seller_id);
  }
  if (props.body.out_of_stock_only === true) {
    whereConditions.push("stock.current_stock = 0");
  } else {
    if (props.body.min_stock !== undefined) {
      whereConditions.push(
        "stock.current_stock >= $" + (whereParams.length + 2),
      );
      whereParams.push(props.body.min_stock);
    }
    if (props.body.max_stock !== undefined) {
      whereConditions.push(
        "stock.current_stock <= $" + (whereParams.length + 2),
      );
      whereParams.push(props.body.max_stock);
    }
  }
  // Build ORDER BY
  const sortField = props.body.sort ?? "updated_at";
  const sortOrder = (props.body.sortOrder ?? "desc").toUpperCase();
  let orderByClause = "";
  switch (sortField) {
    case "stock_quantity":
      orderByClause = "stock.current_stock " + sortOrder;
      break;
    case "product_name":
      orderByClause = "p.name " + sortOrder;
      break;
    case "updated_at":
      orderByClause = "stock.updated_at " + sortOrder;
      break;
  }
  // Build the main query with parameterized placeholders
  const mainQuery = `
    WITH stock AS (
      SELECT 
        variant_id,
        SUM(quantity_change) as current_stock,
        MAX("timestamp") as updated_at
      FROM shopping_mall_inventory_records
      GROUP BY variant_id
    )
    SELECT 
      pv.id,
      pv.sku_code,
      pv.option_values,
      stock.current_stock,
      (p.base_price + COALESCE(pv.price_override, 0)) as price,
      p.name as product_name,
      p.description as product_description,
      c.name as category_name,
      p.seller_id,
      s.shop_name as seller_shop_name,
      stock.updated_at
    FROM stock
    JOIN shopping_mall_product_variants pv ON pv.id = stock.variant_id
    JOIN shopping_mall_products p ON p.id = pv.product_id
    JOIN shopping_mall_categories c ON c.id = p.category_id
    LEFT JOIN shopping_mall_sellers s ON s.id = p.seller_id
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY ${orderByClause}
    OFFSET $${whereParams.length + 1} LIMIT $${whereParams.length + 2}
  `;
  const items = (await MyGlobal.prisma.$queryRawUnsafe(
    mainQuery,
    ...whereParams,
    skip,
    limit,
  )) as any[];
  // Calculate total count
  const countQuery = `
    WITH stock AS (
      SELECT 
        variant_id,
        SUM(quantity_change) as current_stock
      FROM shopping_mall_inventory_records
      GROUP BY variant_id
    )
    SELECT COUNT(*) as total
    FROM stock
    JOIN shopping_mall_product_variants pv ON pv.id = stock.variant_id
    JOIN shopping_mall_products p ON p.id = pv.product_id
    JOIN shopping_mall_categories c ON c.id = p.category_id
    WHERE ${whereConditions.join(" AND ")}
  `;
  const countResult = (await MyGlobal.prisma.$queryRawUnsafe(
    countQuery,
    ...whereParams,
  )) as any[];
  const total = Number(countResult[0]?.total ?? 0);
  // Calculate summary statistics
  const summaryQuery = `
    WITH stock AS (
      SELECT 
        variant_id,
        SUM(quantity_change) as current_stock
      FROM shopping_mall_inventory_records
      GROUP BY variant_id
    )
    SELECT 
      COUNT(*) as totalVariants,
      SUM(CASE WHEN current_stock > 0 THEN 1 ELSE 0 END) as inStockCount,
      SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as outOfStockCount,
      SUM(CASE WHEN current_stock < 10 THEN 1 ELSE 0 END) as lowStockCount,
      SUM(current_stock) as totalStockQuantity
    FROM stock
    JOIN shopping_mall_product_variants pv ON pv.id = stock.variant_id
    JOIN shopping_mall_products p ON p.id = pv.product_id
    JOIN shopping_mall_categories c ON c.id = p.category_id
    WHERE ${whereConditions.join(" AND ")}
  `;
  const summaryResult = (await MyGlobal.prisma.$queryRawUnsafe(
    summaryQuery,
    ...whereParams,
  )) as any[];
  const summary = summaryResult[0];
  return {
    summary: {
      totalVariants: Number(summary?.totalVariants ?? 0),
      inStockCount: Number(summary?.inStockCount ?? 0),
      outOfStockCount: Number(summary?.outOfStockCount ?? 0),
      lowStockCount: Number(summary?.lowStockCount ?? 0),
      totalStockQuantity: Number(summary?.totalStockQuantity ?? 0),
    },
    items: items.map((item) => ({
      id: item.id,
      sku_code: item.sku_code,
      option_values: item.option_values,
      current_stock: Number(item.current_stock),
      price: Number(item.price),
      product_name: item.product_name,
      product_description: item.product_description,
      category_name: item.category_name,
      seller_id: item.seller_id,
      seller_shop_name: item.seller_shop_name,
      updated_at: item.updated_at.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
