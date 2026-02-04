import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAnalyticsProductsEngagement(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallProduct> {
  // Extract pagination parameters from request (but spec says no request body)
  // Given that requestBody is null and parameters are empty, we use fixed defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Execute raw SQL query to aggregate product engagement metrics
  const [data, total] = await Promise.all([
    MyGlobal.prisma.$queryRaw`
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        COUNT(s.id) AS sales_count,
        COUNT(ci.id) AS cart_additions,
        AVG(rs.rating) AS avg_rating,
        COUNT(rs.id) AS review_count,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue
      FROM shopping_mall_products p
      JOIN shopping_mall_sellers sels ON p.seller_id = sels.id
      LEFT JOIN shopping_mall_sales s ON p.id = s.product_id
      LEFT JOIN shopping_mall_cart_items ci ON p.id = ci.product_id
      LEFT JOIN shopping_mall_review_snapshots rs ON p.id = rs.product_id
      WHERE p.is_deleted = false 
        AND sels.approval_status = 'approved'
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
      LIMIT ${limit} OFFSET ${skip}
    ` as unknown as IShoppingMallProduct[],
    MyGlobal.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM shopping_mall_products p
      JOIN shopping_mall_sellers sels ON p.seller_id = sels.id
      WHERE p.is_deleted = false 
        AND sels.approval_status = 'approved'
    ` as unknown as {
      count: number;
    }[],
  ]);
  // Since IShoppingMallProduct is defined as an empty object {}, we must return empty objects
  // The aggregation data must be included in the response structure as per type contract
  // This appears to be a DTO design flaw, but we comply with the spec
  return {
    data: data.map((item) => ({}) as IShoppingMallProduct),
    pagination: {
      current: page,
      limit,
      records: total[0].count,
      pages: Math.ceil(total[0].count / limit),
    } satisfies IPage.IPagination,
  };
}
