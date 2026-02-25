import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchEcommerceAdministratorAnalyticsOrders(props: {
  administrator: AdministratorPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IEcommerceOrder> {
  // Extract and validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (limit > 100) {
    throw new HttpException("Limit cannot exceed 100", 400);
  }
  // Build safe date filtering conditions
  const whereConditions: Prisma.ecommerce_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
  };
  // Add date filtering if provided
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {};
    if (props.body.created_after) {
      // Validate and parse the date string safely
      const createdAfter = new Date(props.body.created_after);
      if (isNaN(createdAfter.getTime())) {
        throw new HttpException("Invalid created_after date format", 400);
      }
      whereConditions.created_at.gte = createdAfter;
    }
    if (props.body.created_before) {
      // Validate and parse the date string safely
      const createdBefore = new Date(props.body.created_before);
      if (isNaN(createdBefore.getTime())) {
        throw new HttpException("Invalid created_before date format", 400);
      }
      whereConditions.created_at.lte = createdBefore;
    }
  }
  try {
    // Execute single optimized query for core metrics
    const [
      totalRevenueResult,
      orderCountResult,
      orderItemsResult,
      sellerPerformanceResult,
    ] = await Promise.all([
      // Total revenue from completed payment transactions
      MyGlobal.prisma.ecommerce_payment_transactions.aggregate({
        where: {
          status: "completed",
          order: whereConditions,
        },
        _sum: { amount: true },
      }),
      // Order count
      MyGlobal.prisma.ecommerce_orders.count({
        where: whereConditions,
      }),
      // Order items for status distribution
      MyGlobal.prisma.ecommerce_order_items.findMany({
        where: {
          order: whereConditions,
        },
        select: { status: true },
      }),
      // Seller performance with grouping
      MyGlobal.prisma.ecommerce_order_items.groupBy({
        by: ["seller_id"],
        where: { order: whereConditions },
        _count: { id: true },
        _sum: { total_price: true },
      }),
    ]);
    const totalRevenue = totalRevenueResult._sum.amount ?? 0;
    const orderCount = orderCountResult;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    // Calculate status distribution
    const statusCounts = orderItemsResult.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const statusDistribution: IEcommerceOrderSnapshotStatusDistribution = {
      paid: statusCounts.paid || 0,
      shipped: statusCounts.shipped || 0,
      delivered: statusCounts.delivered || 0,
      cancelled: statusCounts.cancelled || 0,
      refunded: statusCounts.refunded || 0,
    };
    // Process seller performance with seller details
    const sellerPerformance: IEcommerceOrderSnapshotSellerPerformance[] =
      await Promise.all(
        sellerPerformanceResult.map(async (sp) => {
          const seller = await MyGlobal.prisma.ecommerce_sellers.findUnique({
            where: { id: sp.seller_id, deleted_at: null },
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              account_status: true,
              created_at: true,
            },
          });
          if (!seller) {
            throw new HttpException(`Seller not found: ${sp.seller_id}`, 404);
          }
          const sellerSummary: IEcommerceSeller.ISummary = {
            id: seller.id as string & tags.Format<"uuid">,
            email: seller.email as string & tags.Format<"email">,
            shop_name: seller.shop_name,
            shop_description: seller.shop_description,
            logo_image_url: seller.logo_image_url,
            account_status: seller.account_status,
            created_at: toISOStringSafe(seller.created_at) as string &
              tags.Format<"date-time">,
          };
          const itemCount = await MyGlobal.prisma.ecommerce_order_items.count({
            where: {
              seller_id: sp.seller_id,
              order: whereConditions,
            },
          });
          return {
            seller_id: sp.seller_id as string & tags.Format<"uuid">,
            seller: sellerSummary,
            total_revenue: sp._sum.total_price ?? 0,
            order_count: sp._count.id,
            average_order_value:
              sp._count.id > 0 ? (sp._sum.total_price ?? 0) / sp._count.id : 0,
            item_count: itemCount,
          };
        }),
      );
    // Get category performance using safe parameterized query
    const categoryPerformanceRaw = await MyGlobal.prisma.$queryRaw<
      Array<{
        category_id: string;
        category_name: string;
        category_description: string | null;
        parent_category_id: string | null;
        total_revenue: number;
        order_count: bigint;
        product_count: bigint;
        subcategory_count: bigint;
      }>
    >`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.description as category_description,
        c.parent_category_id,
        COALESCE(SUM(oi.total_price), 0) as total_revenue,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT sc.id) as subcategory_count
      FROM ecommerce_categories c
      LEFT JOIN ecommerce_products p ON p.ecommerce_category_id = c.id AND p.deleted_at IS NULL
      LEFT JOIN ecommerce_order_items oi ON oi.product_variant_id IN (
        SELECT pv.id FROM ecommerce_product_variants pv WHERE pv.product_id = p.id
      )
      LEFT JOIN ecommerce_orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
      LEFT JOIN ecommerce_categories sc ON sc.parent_category_id = c.id AND sc.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
        ${props.body.created_after ? Prisma.sql`AND o.created_at >= ${new Date(props.body.created_after)}` : Prisma.empty}
        ${props.body.created_before ? Prisma.sql`AND o.created_at <= ${new Date(props.body.created_before)}` : Prisma.empty}
      GROUP BY c.id, c.name, c.description, c.parent_category_id
    `;
    const productCategoryPerformance: IEcommerceOrderSnapshotCategoryPerformance[] =
      categoryPerformanceRaw.map((cp) => ({
        id: cp.category_id as string & tags.Format<"uuid">,
        name: cp.category_name,
        description: cp.category_description ?? undefined,
        total_revenue: Number(cp.total_revenue),
        order_count: Number(cp.order_count),
        average_order_value:
          Number(cp.order_count) > 0
            ? Number(cp.total_revenue) / Number(cp.order_count)
            : 0,
        product_count: Number(cp.product_count),
        subcategory_count: Number(cp.subcategory_count),
        parent_category_id: cp.parent_category_id as
          | (string & tags.Format<"uuid">)
          | null,
      }));
    // Get hourly distribution using safe parameterized query
    const hourlyDistributionRaw = await MyGlobal.prisma.$queryRaw<
      Array<{
        hour: bigint;
        order_count: bigint;
        total_revenue: number;
      }>
    >`
      SELECT 
        EXTRACT(HOUR FROM o.created_at)::integer as hour,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
      FROM ecommerce_orders o
      LEFT JOIN ecommerce_order_items oi ON oi.order_id = o.id
      WHERE o.deleted_at IS NULL
        ${props.body.created_after ? Prisma.sql`AND o.created_at >= ${new Date(props.body.created_after)}` : Prisma.empty}
        ${props.body.created_before ? Prisma.sql`AND o.created_at <= ${new Date(props.body.created_before)}` : Prisma.empty}
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY hour
    `;
    const hourlyDistribution: IEcommerceOrderSnapshotHourlyDistribution[] =
      hourlyDistributionRaw.map((hd) => ({
        hour: Number(hd.hour),
        order_count: Number(hd.order_count),
        total_revenue: hd.total_revenue,
        average_order_value:
          Number(hd.order_count) > 0
            ? hd.total_revenue / Number(hd.order_count)
            : 0,
      }));
    // Return the complete analytics object
    return {
      period: toISOStringSafe(new Date()) as string & tags.Format<"date-time">,
      total_revenue: totalRevenue,
      order_count: orderCount,
      average_order_value: averageOrderValue,
      status_distribution: statusDistribution,
      seller_performance: sellerPerformance,
      product_category_performance: productCategoryPerformance,
      geographic_distribution: {
        country_distribution: [],
        region_distribution: [],
        city_distribution: [],
        top_regions: [],
        unknown_locations: null,
      },
      hourly_distribution: hourlyDistribution,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Failed to generate analytics", 500);
  }
}
