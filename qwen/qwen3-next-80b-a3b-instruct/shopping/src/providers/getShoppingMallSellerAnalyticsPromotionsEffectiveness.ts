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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerAnalyticsPromotionsEffectiveness(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallSalePromotion> {
  // Define pagination defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Execute query with proper pagination
  const results = await MyGlobal.prisma.$queryRaw`
    SELECT
      COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue,
      COALESCE(AVG(sp.discount_percentage), 0) AS discountRate,
      COUNT(DISTINCT o.customer_id) AS uniqueCustomers,
      COALESCE(SUM(oi.quantity), 0) AS unitsSold,
      COALESCE((COUNT(oi.id) * 100.0) / NULLIF(SUM(svs.views), 0), 0) AS conversionRate,
      sp.promotion_name AS promotionName,
      sp.promotion_type AS promotionType
    FROM shopping_mall_sale_promotions sp
    JOIN shopping_mall_sales s ON sp.sale_id = s.id
    JOIN shopping_mall_order_items oi ON s.id = oi.sale_id
    JOIN shopping_mall_orders o ON oi.order_id = o.id
    LEFT JOIN shopping_mall_sale_view_stats svs ON s.id = svs.sale_id
    WHERE s.seller_id = ${props.seller.id}
    GROUP BY sp.id, sp.promotion_name, sp.promotion_type
    ORDER BY revenue DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;
  // Count total records for pagination
  const totalCount = await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM shopping_mall_sale_promotions sp
    JOIN shopping_mall_sales s ON sp.sale_id = s.id
    JOIN shopping_mall_order_items oi ON s.id = oi.sale_id
    JOIN shopping_mall_orders o ON oi.order_id = o.id
    LEFT JOIN shopping_mall_sale_view_stats svs ON s.id = svs.sale_id
    WHERE s.seller_id = ${props.seller.id}
  `;
  // Transform results to IShoppingMallSalePromotion format with proper number conversion
  const data: IShoppingMallSalePromotion[] = (results as any[]).map(
    (row: any) => ({
      revenue: Number(row.revenue),
      discountRate: Number(row.discountRate),
      uniqueCustomers: Number(row.uniqueCustomers),
      unitsSold: Number(row.unitsSold),
      conversionRate: Number(row.conversionRate),
      promotionName: row.promotionName,
      promotionType: row.promotionType,
    }),
  );
  // Calculate pagination properties
  const total = Number((totalCount as any[])[0].total);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
