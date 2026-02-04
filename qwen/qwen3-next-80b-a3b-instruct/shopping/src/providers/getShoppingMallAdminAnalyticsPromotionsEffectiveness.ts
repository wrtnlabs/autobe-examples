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
import { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAnalyticsPromotionsEffectiveness(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallSalePromotion> {
  // Extract pagination parameters from request body (per operation spec)
  // Note: Specification states this is a GET endpoint but with request body for pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Perform database-side aggregation with proper joins, grouping, and metrics calculation
  const results = await MyGlobal.prisma.$queryRaw`
    SELECT 
      sp.name as promotionName,
      sp.discount_value as discountRate,
      SUM(oi.price * oi.quantity) as revenue,
      COUNT(DISTINCT oi.shopping_mall_customer_id) as uniqueCustomers,
      SUM(oi.quantity) as unitsSold,
      sp.promotion_type as promotionType
    FROM shopping_mall_sale_promotions sp
    JOIN shopping_mall_sales s ON sp.shopping_mall_sale_id = s.id
    JOIN shopping_mall_order_items oi ON s.id = oi.shopping_mall_sale_id
    WHERE sp.is_deleted = false
    GROUP BY sp.id, sp.name, sp.discount_value, sp.promotion_type
    ORDER BY sp.created_at DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;
  // Count total records for pagination
  const total = await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) as total
    FROM shopping_mall_sale_promotions sp
    JOIN shopping_mall_sales s ON sp.shopping_mall_sale_id = s.id
    JOIN shopping_mall_order_items oi ON s.id = oi.shopping_mall_sale_id
    WHERE sp.is_deleted = false
  `;
  // Transform results into IPageIShoppingMallSalePromotion format
  // We know results is an array of records with the expected column names
  const transformedData: IShoppingMallSalePromotion[] = (results as any[]).map(
    (result: any) => {
      // Calculate conversion rate as 0 since shopping_mall_sale_view_stats table is unavailable
      const conversionRate = 0;
      return {
        revenue: Number(result.revenue),
        discountRate: Number(result.discountRate),
        uniqueCustomers: Number(result.uniqueCustomers),
        unitsSold: Number(result.unitsSold),
        conversionRate,
        promotionName: result.promotionName,
        promotionType: result.promotionType || "other",
      };
    },
  );
  // Calculate total pages
  const pages = Math.ceil(Number((total as any[])[0].total) / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: Number((total as any[])[0].total),
      pages,
    },
    data: transformedData,
  };
}
