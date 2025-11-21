import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatistics";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IShoppingMallSalesGroupingDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesGroupingDimension";
import { IShoppingMallSaleFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFilters";
import { IShoppingMallSaleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatus";
import { IShoppingMallSalesMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesMetric";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleStatistics";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategorySalesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySalesSummary";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSalesTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesTrend";
import { IShoppingMallDailySalesData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDailySalesData";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminStatisticsSales(props: {
  admin: AdminPayload;
  body: IShoppingMallSaleStatistics.IRequest;
}): Promise<IPageIShoppingMallSaleStatistics> {
  const { date_range, group_by, filters, metrics, pagination } = props.body;

  // Build WHERE conditions with proper type assertion
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Date range filtering
  if (date_range.start || date_range.end) {
    (whereConditions.sale_date as Record<string, unknown>) = {};
    if (date_range.start) {
      ((whereConditions.sale_date as Record<string, unknown>).gte as Date) =
        new Date(date_range.start);
    }
    if (date_range.end) {
      ((whereConditions.sale_date as Record<string, unknown>).lte as Date) =
        new Date(date_range.end);
    }
  }

  // Status filtering
  if (filters?.sale_status && filters.sale_status.length > 0) {
    (whereConditions.sale_status as Record<string, unknown>) = {
      in: filters.sale_status,
    };
  }

  // Seller filtering
  if (filters?.seller_ids && filters.seller_ids.length > 0) {
    (whereConditions.shopping_mall_seller_id as Record<string, unknown>) = {
      in: filters.seller_ids,
    };
  }

  // Customer filtering
  if (filters?.customer_ids && filters.customer_ids.length > 0) {
    (whereConditions.shopping_mall_customer_id as Record<string, unknown>) = {
      in: filters.customer_ids,
    };
  }

  // Amount range filtering
  if (filters?.min_amount !== undefined || filters?.max_amount !== undefined) {
    (whereConditions.sale_amount as Record<string, unknown>) = {};
    if (filters?.min_amount !== undefined) {
      ((whereConditions.sale_amount as Record<string, unknown>).gte as number) =
        filters.min_amount;
    }
    if (filters?.max_amount !== undefined) {
      ((whereConditions.sale_amount as Record<string, unknown>).lte as number) =
        filters.max_amount;
    }
  }

  // Handle pagination
  const page = pagination?.current ?? 1;
  const limit = pagination?.limit ?? 100;
  const skip = (page - 1) * limit;

  // For complex analytics, we'll use multiple queries
  const [
    salesData,
    totalSales,
    totalRevenue,
    averageSale,
    commissionEarned,
    netPayout,
  ] = await Promise.all([
    // Get paginated sales data
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: whereConditions,
      include: {
        seller: {
          select: {
            id: true,
            business_name: true,
            contact_person: true,
            email: true,
            status: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { sale_date: "desc" },
    }),

    // Get total sales count
    MyGlobal.prisma.shopping_mall_sales.count({
      where: whereConditions,
    }),

    // Get total revenue
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      where: whereConditions,
      _sum: { sale_amount: true },
    }),

    // Get average sale
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      where: whereConditions,
      _avg: { sale_amount: true },
    }),

    // Get commission earned
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      where: whereConditions,
      _sum: { commission_rate: true },
    }),

    // Get net payout
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      where: whereConditions,
      _sum: { net_amount: true },
    }),
  ]);

  // Transform sales data to match expected format
  const data = salesData.map((sale) => ({
    total_sales: totalSales,
    total_revenue: totalRevenue._sum?.sale_amount ?? 0,
    average_order_value: averageSale._avg?.sale_amount ?? 0,
    commission_earned: commissionEarned._sum?.commission_rate ?? 0,
    net_payout: netPayout._sum?.net_amount ?? 0,
    seller: {
      id: sale.seller.id,
      business_name: sale.seller.business_name,
      contact_person: sale.seller.contact_person,
      email: sale.seller.email,
      status: sale.seller.status,
    },
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: totalSales,
      pages: Math.ceil(totalSales / limit),
    },
    data,
  };
}
