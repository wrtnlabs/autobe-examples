import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorSellerPerformance(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with date string handling
  const whereConditions: Prisma.ecommerce_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { shop_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.account_status && {
      account_status: props.body.account_status,
    }),
    ...(props.body.created_after && {
      created_at: {
        gte: new Date(props.body.created_after),
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: new Date(props.body.created_before),
      },
    }),
  };
  // Get total count for pagination before performance calculations
  const total = await MyGlobal.prisma.ecommerce_sellers.count({
    where: whereConditions,
  });
  // Get sellers with basic info first
  const sellers = await MyGlobal.prisma.ecommerce_sellers.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
  // Calculate performance metrics for each seller using separate optimized queries
  const data = await Promise.all(
    sellers.map(async (seller) => {
      // Calculate orders metrics - remove deleted_at filter as it doesn't exist
      const ordersResult =
        await MyGlobal.prisma.ecommerce_order_items.aggregate({
          where: {
            seller_id: seller.id,
          },
          _count: { _all: true },
          _sum: { total_price: true },
        });
      const totalOrders = ordersResult._count?._all ?? 0;
      const totalRevenue = ordersResult._sum?.total_price ?? 0;
      // Calculate average rating from reviews
      const reviewsResult = await MyGlobal.prisma.ecommerce_reviews.aggregate({
        where: {
          product: {
            ecommerce_seller_id: seller.id,
          },
          is_deleted: false,
          deleted_at: null,
        },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const averageRating = reviewsResult._avg?.rating ?? null;
      const totalReviews = reviewsResult._count?._all ?? 0;
      // Calculate cancellation rate
      const cancellationsResult =
        await MyGlobal.prisma.ecommerce_cancellation_requests.count({
          where: {
            ecommerce_seller_id: seller.id,
            deleted_at: null,
          },
        });
      const cancellationRate =
        totalOrders > 0 ? (cancellationsResult / totalOrders) * 100 : 0;
      // Calculate refund rate
      const refundsResult =
        await MyGlobal.prisma.ecommerce_refund_requests.count({
          where: {
            ecommerce_seller_id: seller.id,
            deleted_at: null,
          },
        });
      const refundRate =
        totalOrders > 0 ? (refundsResult / totalOrders) * 100 : 0;
      return {
        id: seller.id as string & tags.Format<"uuid">,
        email: seller.email as string & tags.Format<"email">,
        shop_name: seller.shop_name,
        shop_description: seller.shop_description,
        logo_image_url: seller.logo_image_url,
        account_status: seller.account_status,
        created_at: toISOStringSafe(seller.created_at) as string &
          tags.Format<"date-time">,
        // Include performance metrics in the response
        performance_metrics: {
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          average_rating: averageRating,
          total_reviews: totalReviews,
          cancellation_rate: cancellationRate,
          refund_rate: refundRate,
        },
      };
    }),
  );
  return {
    data: data.map(
      (item) =>
        ({
          id: item.id,
          email: item.email,
          shop_name: item.shop_name,
          shop_description: item.shop_description,
          logo_image_url: item.logo_image_url,
          account_status: item.account_status,
          created_at: item.created_at,
        }) satisfies IEcommerceSeller.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
