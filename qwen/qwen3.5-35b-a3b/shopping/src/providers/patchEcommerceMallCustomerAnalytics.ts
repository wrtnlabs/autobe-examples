import { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAnalytics(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAnalytic.IRequest;
}): Promise<IPageIEcommerceMallAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const ordersCountFilter: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
  };
  const ordersRevenueFilter: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
  };
  const ordersStatusFilter: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
  };
  if (props.body.start_date || props.body.end_date) {
    const dateFilter: Prisma.DateTimeFilter<"ecommerce_mall_orders"> =
      {} as any;
    if (props.body.start_date) dateFilter.gte = props.body.start_date;
    if (props.body.end_date) dateFilter.lte = props.body.end_date;
    ordersCountFilter.created_at = dateFilter;
    ordersRevenueFilter.created_at = dateFilter;
    ordersStatusFilter.created_at = dateFilter;
  }
  const ordersCountResult =
    await MyGlobal.prisma.ecommerce_mall_orders.aggregate({
      where: ordersCountFilter,
      _count: true,
    });
  const ordersRevenueResult =
    await MyGlobal.prisma.ecommerce_mall_orders.aggregate({
      where: ordersRevenueFilter,
      _sum: { total_price: true },
      _avg: { total_price: true },
    });
  const ordersByStatus = await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
    by: ["overall_status"],
    where: ordersStatusFilter,
    _count: true,
  });
  const productsFilter: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    is_active: true,
  };
  if (props.body.seller_id) productsFilter.seller_id = props.body.seller_id;
  if (props.body.category_id)
    productsFilter.category_id = props.body.category_id;
  if (props.body.product_id) productsFilter.id = props.body.product_id;
  const productsResult =
    await MyGlobal.prisma.ecommerce_mall_products.aggregate({
      where: productsFilter,
      _count: true,
      _avg: { base_price: true },
    });
  const productsByCategory =
    await MyGlobal.prisma.ecommerce_mall_products.groupBy({
      by: ["category_id"],
      where: productsFilter,
      _count: true,
    });
  const customersFilter: Prisma.ecommerce_mall_customersWhereInput = {
    deleted_at: null,
    is_banned: false,
  };
  if (props.body.start_date || props.body.end_date) {
    customersFilter.created_at =
      {} as Prisma.DateTimeFilter<"ecommerce_mall_customers">;
    if (props.body.start_date)
      (customersFilter.created_at as any).gte = props.body.start_date;
    if (props.body.end_date)
      (customersFilter.created_at as any).lte = props.body.end_date;
  }
  const customersResult =
    await MyGlobal.prisma.ecommerce_mall_customers.aggregate({
      where: customersFilter,
      _count: true,
    });
  const customersByDate =
    await MyGlobal.prisma.ecommerce_mall_customers.groupBy({
      by: ["created_at"],
      where: customersFilter,
      _count: true,
    });
  const sellersFilter: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
  };
  if (props.body.start_date || props.body.end_date) {
    sellersFilter.created_at =
      {} as Prisma.DateTimeFilter<"ecommerce_mall_sellers">;
    if (props.body.start_date)
      (sellersFilter.created_at as any).gte = props.body.start_date;
    if (props.body.end_date)
      (sellersFilter.created_at as any).lte = props.body.end_date;
  }
  const sellersResult = await MyGlobal.prisma.ecommerce_mall_sellers.aggregate({
    where: sellersFilter,
    _count: true,
  });
  const sellersByStatus = await MyGlobal.prisma.ecommerce_mall_sellers.groupBy({
    by: ["approval_status"],
    where: sellersFilter,
    _count: true,
  });
  const activeSellersResult =
    await MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: { ...sellersFilter, is_banned: false, is_suspended: false },
    });
  const reviewsFilter: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: null,
    is_active: true,
  };
  if (props.body.start_date || props.body.end_date) {
    reviewsFilter.created_at =
      {} as Prisma.DateTimeFilter<"ecommerce_mall_reviews">;
    if (props.body.start_date)
      (reviewsFilter.created_at as any).gte = props.body.start_date;
    if (props.body.end_date)
      (reviewsFilter.created_at as any).lte = props.body.end_date;
  }
  if (props.body.product_id) reviewsFilter.product_id = props.body.product_id;
  const reviewsResult = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    where: reviewsFilter,
    _avg: { rating: true },
    _count: true,
  });
  const reviewsByProduct = await MyGlobal.prisma.ecommerce_mall_reviews.groupBy(
    {
      by: ["product_id"],
      where: reviewsFilter,
      _count: true,
    },
  );
  const ordersByStatusMap: Record<string, number> = {};
  for (const item of ordersByStatus)
    ordersByStatusMap[item.overall_status] = item._count;
  const productsByCategoryMap: Record<string, number> = {};
  for (const item of productsByCategory)
    productsByCategoryMap[item.category_id] = item._count;
  const customersByRegistrationDateMap: Record<string, number> = {};
  for (const item of customersByDate) {
    customersByRegistrationDateMap[toISOStringSafe(item.created_at)] =
      item._count;
  }
  const sellersByApprovalStatusMap: Record<string, number> = {};
  for (const item of sellersByStatus)
    sellersByApprovalStatusMap[item.approval_status] = item._count;
  const reviewsByProductMap: Record<string, number> = {};
  for (const item of reviewsByProduct)
    reviewsByProductMap[item.product_id] = item._count;
  const analyticsData: IEcommerceMallAnalytic.ISummary = {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: {
      orders: {
        totalOrders: ordersCountResult._count,
        totalRevenue: Number(ordersRevenueResult._sum.total_price ?? 0),
        averageOrderValue: ordersRevenueResult._avg.total_price ?? 0,
        ordersByStatus: ordersByStatusMap,
      },
      products: {
        totalProducts: productsResult._count,
        productsByCategory: productsByCategoryMap,
        averageProductPrice: productsResult._avg.base_price ?? 0,
      },
      customers: {
        totalCustomers: customersResult._count,
        customersByRegistrationDate: customersByRegistrationDateMap,
      },
      sellers: {
        totalSellers: sellersResult._count,
        sellersByApprovalStatus: sellersByApprovalStatusMap,
        activeSellers: activeSellersResult,
      },
      reviews: {
        averageRating: reviewsResult._avg.rating ?? 0,
        totalReviews: reviewsResult._count,
        reviewsByProduct: reviewsByProductMap,
      },
    },
  } satisfies IEcommerceMallAnalytic.ISummary;
  return {
    pagination: {
      current: page,
      limit,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [analyticsData],
  } satisfies IPageIEcommerceMallAnalytic.ISummary;
}
