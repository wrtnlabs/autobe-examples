import { IEcommerceMallCustomerBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerBehavior";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerBehavior";
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

export async function patchEcommerceMallSellerAnalyticsCustomerBehavior(props: {
  seller: SellerPayload;
  body: IEcommerceMallCustomerBehavior.IRequest;
}): Promise<IPageIEcommerceMallCustomerBehavior.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for orders
  const whereConditions: Prisma.ecommerce_mall_ordersWhereInput = {
    customer: {
      deleted_at: null,
    },
    orderItems: {
      some: {
        seller_id: props.seller.id,
      },
    },
    deleted_at: null,
  };
  // Date range filtering
  if (props.body.start_date || props.body.end_date) {
    if (props.body.start_date) {
      whereConditions.created_at = whereConditions.created_at || {};
      whereConditions.created_at = {
        ...(whereConditions.created_at as any),
        gte: toISOStringSafe(props.body.start_date),
      };
    }
    if (props.body.end_date) {
      whereConditions.created_at = whereConditions.created_at || {};
      whereConditions.created_at = {
        ...(whereConditions.created_at as any),
        lte: toISOStringSafe(props.body.end_date),
      };
    }
  }
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereConditions,
  });
  // Get paginated orders with related data
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: props.body.sort_by
      ? {
          created_at: props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" },
    include: {
      orderItems: {
        where: {
          seller_id: props.seller.id,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });
  // Calculate aggregated metrics per product
  const productMetrics: Record<
    string,
    {
      product_id: string & tags.Format<"uuid">;
      product_name: string;
      product_category: string;
      view_count: number & tags.Type<"int32"> & tags.Minimum<0>;
      cart_add_count: number & tags.Type<"int32"> & tags.Minimum<0>;
      purchase_count: number & tags.Type<"int32"> & tags.Minimum<0>;
      conversion_rate: number & tags.Minimum<0> & tags.Maximum<100>;
      average_order_value: number & tags.Minimum<0>;
      total_revenue: number & tags.Minimum<0>;
      cart_abandonment_rate: number & tags.Minimum<0> & tags.Maximum<100>;
      time_period: string;
    }
  > = {};
  // Process orders to aggregate metrics
  for (const order of orders) {
    const orderDate = order.created_at;
    for (const item of order.orderItems) {
      if (!productMetrics[item.product.id]) {
        productMetrics[item.product.id] = {
          product_id: item.product.id as string & tags.Format<"uuid">,
          product_name: item.product_name,
          product_category: item.product.category?.name ?? "",
          view_count: 0,
          cart_add_count: 0,
          purchase_count: 0,
          conversion_rate: 0,
          average_order_value: 0,
          total_revenue: 0,
          cart_abandonment_rate: 0,
          time_period: "30d",
        };
      }
      // Increment purchase count and revenue
      productMetrics[item.product.id].purchase_count++;
      productMetrics[item.product.id].total_revenue += Number(
        item.product_price,
      );
    }
  }
  // Calculate derived metrics and build summary data
  const summaryData: IEcommerceMallCustomerBehavior.ISummary[] = Object.values(
    productMetrics,
  ).map((metric) => ({
    ...metric,
    conversion_rate:
      metric.purchase_count > 0 && metric.view_count > 0
        ? (Number(
            ((metric.purchase_count / metric.view_count) * 100).toFixed(2),
          ) as number & tags.Minimum<0> & tags.Maximum<100>)
        : 0,
    average_order_value:
      metric.purchase_count > 0
        ? (Number(
            (metric.total_revenue / metric.purchase_count).toFixed(2),
          ) as number & tags.Minimum<0>)
        : 0,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
