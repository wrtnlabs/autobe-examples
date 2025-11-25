import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerStatisticsSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleStatistics.IRequest;
}): Promise<IPageIShoppingMallSaleStatistics> {
  const page = props.body.pagination?.current ?? 1;
  const limit = props.body.pagination?.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build base WHERE conditions with proper typing
  const whereConditions: Prisma.shopping_mall_salesWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
  };

  // Apply date range filter
  if (props.body.date_range.start || props.body.date_range.end) {
    whereConditions.sale_date = {};
    if (props.body.date_range.start) {
      whereConditions.sale_date.gte = new Date(props.body.date_range.start);
    }
    if (props.body.date_range.end) {
      whereConditions.sale_date.lte = new Date(props.body.date_range.end);
    }
  }

  // Apply sale status filter
  if (
    props.body.filters?.sale_status &&
    props.body.filters.sale_status.length > 0
  ) {
    whereConditions.sale_status = { in: props.body.filters.sale_status };
  }

  // Apply customer filter
  if (
    props.body.filters?.customer_ids &&
    props.body.filters.customer_ids.length > 0
  ) {
    whereConditions.shopping_mall_customer_id = {
      in: props.body.filters.customer_ids,
    };
  }

  // Apply amount range filter
  if (
    props.body.filters?.min_amount !== undefined ||
    props.body.filters?.max_amount !== undefined
  ) {
    whereConditions.sale_amount = {};
    if (props.body.filters.min_amount !== undefined) {
      whereConditions.sale_amount.gte = props.body.filters.min_amount;
    }
    if (props.body.filters.max_amount !== undefined) {
      whereConditions.sale_amount.lte = props.body.filters.max_amount;
    }
  }

  // Get seller details for the response
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      business_name: true,
      contact_person: true,
      email: true,
      status: true,
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // Execute aggregation query using Prisma's aggregation functions
  const aggregationResult = await MyGlobal.prisma.shopping_mall_sales.aggregate(
    {
      where: whereConditions,
      _sum: {
        sale_amount: true,
        item_count: true,
        net_amount: true,
      },
      _avg: {
        sale_amount: true,
      },
      _count: {
        id: true,
      },
    },
  );

  // Calculate commission earned
  const commissionEarned = aggregationResult._sum.sale_amount
    ? aggregationResult._sum.sale_amount * 0.1 // Assuming 10% commission rate
    : 0;

  // Build the statistics object
  const statistics: IShoppingMallSaleStatistics = {
    total_sales: aggregationResult._count.id ?? 0,
    total_revenue: aggregationResult._sum.sale_amount ?? 0,
    average_order_value: aggregationResult._avg.sale_amount ?? 0,
    commission_earned: commissionEarned,
    net_payout: aggregationResult._sum.net_amount ?? 0,
    seller: {
      id: props.seller.id,
      business_name: seller.business_name,
      contact_person: seller.contact_person,
      email: seller.email,
      status: seller.status,
    },
  };

  // Get paginated sales data
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { sale_date: "desc" },
    include: {
      customer: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
      order: true, // Simplified include - remove invalid items field
    },
  });

  // Transform sales data to statistics format
  const data = sales.map((sale) => ({
    ...statistics,
    // Add sale-specific data if available
    ...(sale.order &&
      {
        // Add any order-specific statistics if needed
      }),
  }));

  const total = await MyGlobal.prisma.shopping_mall_sales.count({
    where: whereConditions,
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: [statistics], // Return aggregated statistics
  };
}
