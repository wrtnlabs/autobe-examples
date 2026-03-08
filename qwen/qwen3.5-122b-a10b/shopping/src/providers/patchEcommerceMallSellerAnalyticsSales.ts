import { IEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSalesAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSalesAnalytic";
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

export async function patchEcommerceMallSellerAnalyticsSales(props: {
  seller: SellerPayload;
  body: IEcommerceMallSalesAnalytic.IRequest;
}): Promise<IPageIEcommerceMallSalesAnalytic.ISummary> {
  // Parse and validate date range
  const dateFrom = props.body.date_from
    ? new Date(props.body.date_from)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const dateTo = props.body.date_to ? new Date(props.body.date_to) : new Date();
  // Validate date range
  if (dateFrom > dateTo) {
    throw new HttpException("date_from must be before date_to", 400);
  }
  // Validate 90-day range constraint
  const dayDiff =
    (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
  if (dayDiff > 90) {
    throw new HttpException("Date range cannot exceed 90 days", 400);
  }
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    created_at: {
      gte: dateFrom,
      lt: dateTo,
    },
    orderItems: {
      some: {
        productVariant: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    },
  };
  // Apply status filter
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  // Apply seller filter (override default seller filter if provided)
  if (props.body.seller_id) {
    whereInput.orderItems = {
      some: {
        productVariant: {
          product: {
            seller_id: props.body.seller_id,
          },
        },
      },
    };
  }
  // Apply category filter
  if (props.body.category_id) {
    if (whereInput.orderItems?.some) {
      whereInput.orderItems = {
        some: {
          AND: [
            whereInput.orderItems.some,
            {
              productVariant: {
                product: {
                  category_id: props.body.category_id,
                },
              },
            },
          ],
        },
      };
    } else {
      whereInput.orderItems = {
        some: {
          productVariant: {
            product: {
              category_id: props.body.category_id,
            },
          },
        },
      };
    }
  }
  // Apply search filter
  if (props.body.search) {
    whereInput.OR = [
      {
        order_number: {
          contains: props.body.search,
        },
      },
      {
        orderItems: {
          some: {
            productVariant: {
              product: {
                name: {
                  contains: props.body.search,
                },
              },
            },
          },
        },
      },
    ];
  }
  // Calculate skip and limit
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build orderBy
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput =
    props.body.sort_by
      ? {
          [props.body.sort_by]: props.body.sort_order ?? "desc",
        }
      : {
          created_at: "desc",
        };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  // Get orders with order items for aggregation
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    include: {
      orderItems: {
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });
  // Aggregate data by date period (day)
  const aggregatedData = new Map<
    string,
    {
      totalRevenue: number;
      orderCount: number;
      itemCount: number;
      sellerId?: string;
      sellerName?: string;
      categoryId?: string;
      categoryName?: string;
      status?: string;
    }
  >();
  for (const order of orders) {
    const dateKey =
      toISOStringSafe(order.created_at).split("T")[0] + "T00:00:00.000Z";
    let data = aggregatedData.get(dateKey);
    if (!data) {
      data = {
        totalRevenue: 0,
        orderCount: 0,
        itemCount: 0,
      };
      aggregatedData.set(dateKey, data);
    }
    data.totalRevenue += order.total_price;
    data.orderCount += 1;
    data.itemCount += order.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    // Extract seller/category info from first order item if available
    if (order.orderItems.length > 0) {
      const firstItem = order.orderItems[0];
      if (!data.sellerId && firstItem.productVariant.product.seller_id) {
        data.sellerId = firstItem.productVariant.product.seller_id;
      }
      if (!data.categoryId && firstItem.productVariant.product.category_id) {
        data.categoryId = firstItem.productVariant.product.category_id;
      }
    }
    data.status = order.status;
  }
  // Fetch seller and category names
  const sellerIds = [
    ...new Set(
      Array.from(aggregatedData.values())
        .map((d) => d.sellerId)
        .filter((id): id is string => !!id),
    ),
  ];
  const categoryIds = [
    ...new Set(
      Array.from(aggregatedData.values())
        .map((d) => d.categoryId)
        .filter((id): id is string => !!id),
    ),
  ];
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, shop_name: true },
  });
  const categories = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s.shop_name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  // Transform to ISummary format
  const data: IEcommerceMallSalesAnalytic.ISummary[] = Array.from(
    aggregatedData.entries(),
  ).map(([dateKey, agg]) => ({
    id: v4() as string & tags.Format<"uuid">,
    date: dateKey as string & tags.Format<"date-time">,
    totalRevenue: agg.totalRevenue,
    orderCount: agg.orderCount,
    averageOrderValue:
      agg.orderCount > 0 ? agg.totalRevenue / agg.orderCount : 0,
    itemCount: agg.itemCount,
    sellerId: agg.sellerId ?? null,
    sellerName: agg.sellerId ? (sellerMap.get(agg.sellerId) ?? null) : null,
    categoryId: agg.categoryId ?? null,
    categoryName: agg.categoryId
      ? (categoryMap.get(agg.categoryId) ?? null)
      : null,
    status: agg.status ?? null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
