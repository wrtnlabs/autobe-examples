import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAnalytic";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAnalyticsOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderAnalytic.IRequest;
}): Promise<IPageIShoppingMallOrderAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for order filtering
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.customerId && {
      shopping_mall_customer_id: props.body.customerId,
    }),
    ...(props.body.minPrice !== undefined && {
      total_price: {
        gte: props.body.minPrice,
      },
    }),
    ...(props.body.maxPrice !== undefined && {
      total_price: {
        lte: props.body.maxPrice,
      },
    }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  // Add seller filter through order items if sellerId is provided
  if (props.body.sellerId) {
    whereInput.orderItems = {
      some: {
        shopping_mall_seller_id: props.body.sellerId,
        deleted_at: null,
      },
    };
  }
  // Build orderBy clause
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "created_at_asc":
          return { created_at: "asc" as const };
        case "total_price":
          return { total_price: "asc" as const };
        case "total_price_desc":
          return { total_price: "desc" as const };
        case "status":
          return { status: "asc" as const };
        case "status_desc":
          return { status: "desc" as const };
        default:
          return { created_at: "desc" as const };
      }
    })() satisfies Prisma.shopping_mall_ordersOrderByWithRelationInput;
  // Query orders with aggregations
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      total_price: true,
      status: true,
      created_at: true,
      customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      orderItems: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          cancellationRequests: {
            where: {
              status: "approved",
              deleted_at: null,
            },
            select: {
              id: true,
            },
          },
          refundRequests: {
            where: {
              status: "approved",
              deleted_at: null,
            },
            select: {
              id: true,
            },
          },
          shipmentItem: {
            select: {
              shipment: {
                select: {
                  delivered_at: true,
                },
              },
            },
          },
        },
      } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  // Transform orders to analytics summary format
  const data = await ArrayUtil.asyncMap(orders, async (order) => {
    const orderItems = order.orderItems;
    const orderItemsCount = orderItems.length;
    const cancellationCount = orderItems.reduce(
      (acc, item) => acc + item.cancellationRequests.length,
      0,
    );
    const refundCount = orderItems.reduce(
      (acc, item) => acc + item.refundRequests.length,
      0,
    );
    const shipmentCount = orderItems.filter(
      (item) => item.shipmentItem !== null,
    ).length;
    // Find the max delivered_at from all shipments
    const deliveredAt = orderItems
      .map((item) => item.shipmentItem?.shipment?.delivered_at)
      .filter((d): d is Date => d !== null && d !== undefined)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      id: order.id,
      total_price: order.total_price,
      status: order.status,
      created_at: order.created_at.toISOString(),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        order.customer,
      ),
      order_items_count: orderItemsCount,
      cancellation_count: cancellationCount,
      refund_count: refundCount,
      shipment_count: shipmentCount,
      delivered_at: deliveredAt?.toISOString() ?? null,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
