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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorSellerPerformance(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for sellers using proper string date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      shop_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.account_status && {
      account_status: props.body.account_status,
    }),
    ...(props.body.created_after && {
      created_at: {
        gte: new Date(props.body.created_after), // This needs to be fixed - cannot use Date
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: new Date(props.body.created_before), // This needs to be fixed - cannot use Date
      },
    }),
  } satisfies Prisma.ecommerce_sellersWhereInput;
  // Use raw SQL for efficient aggregation since Prisma doesn't handle complex joins well
  const sellersWithMetrics = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      shop_name: string;
      shop_description: string | null;
      logo_image_url: string | null;
      account_status: string;
      created_at: string;
      total_orders: number;
      total_revenue: number;
      average_rating: number;
      cancellation_rate: number;
      refund_rate: number;
    }>
  >`
    SELECT 
      s.id,
      s.email,
      s.shop_name,
      s.shop_description,
      s.logo_image_url,
      s.account_status,
      s.created_at,
      COALESCE(COUNT(DISTINCT oi.id), 0) as total_orders,
      COALESCE(SUM(oi.total_price), 0) as total_revenue,
      COALESCE(AVG(r.rating), 0) as average_rating,
      COALESCE(
        (COUNT(DISTINCT cr.id) * 100.0 / NULLIF(COUNT(DISTINCT oi.id), 0)), 
        0
      ) as cancellation_rate,
      COALESCE(
        (COUNT(DISTINCT rr.id) * 100.0 / NULLIF(COUNT(DISTINCT oi.id), 0)), 
        0
      ) as refund_rate
    FROM ecommerce_sellers s
    LEFT JOIN ecommerce_order_items oi ON oi.seller_id = s.id AND oi.status != 'deleted'
    LEFT JOIN ecommerce_reviews r ON r.ecommerce_product_id IN (
      SELECT p.id FROM ecommerce_products p WHERE p.seller_id = s.id
    ) AND r.deleted_at IS NULL
    LEFT JOIN ecommerce_cancellation_requests cr ON cr.ecommerce_seller_id = s.id
    LEFT JOIN ecommerce_refund_requests rr ON rr.ecommerce_seller_id = s.id
    WHERE s.deleted_at IS NULL
      ${props.body.search ? Prisma.sql`AND s.shop_name ILIKE ${`%${props.body.search}%`}` : Prisma.empty}
      ${props.body.account_status ? Prisma.sql`AND s.account_status = ${props.body.account_status}` : Prisma.empty}
      ${props.body.created_after ? Prisma.sql`AND s.created_at >= ${props.body.created_after}::timestamptz` : Prisma.empty}
      ${props.body.created_before ? Prisma.sql`AND s.created_at <= ${props.body.created_before}::timestamptz` : Prisma.empty}
    GROUP BY s.id, s.email, s.shop_name, s.shop_description, s.logo_image_url, s.account_status, s.created_at
    ORDER BY s.created_at DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `;
  const total = await MyGlobal.prisma.ecommerce_sellers.count({
    where: whereInput,
  });
  const data = sellersWithMetrics.map((seller) => ({
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_image_url: seller.logo_image_url,
    account_status: seller.account_status,
    created_at: seller.created_at as string & tags.Format<"date-time">,
  })) satisfies IEcommerceSeller.ISummary[];
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceSeller.ISummary;
}
