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
  // Build where clause for orders
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
  };
  // Apply date range filters
  if (props.body.startDate !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
    };
  }
  if (props.body.endDate !== undefined) {
    if (whereInput.created_at && typeof whereInput.created_at === "object") {
      (whereInput.created_at as any).lte = new Date(props.body.endDate);
    } else {
      whereInput.created_at = { lte: new Date(props.body.endDate) };
    }
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply customer filter
  if (props.body.customerId !== undefined) {
    whereInput.shopping_mall_customer_id = props.body.customerId;
  }
  // Apply price filters
  if (props.body.minPrice !== undefined) {
    whereInput.total_price = { gte: props.body.minPrice };
  }
  if (props.body.maxPrice !== undefined) {
    if (whereInput.total_price && typeof whereInput.total_price === "object") {
      (whereInput.total_price as any).lte = props.body.maxPrice;
    } else {
      whereInput.total_price = { lte: props.body.maxPrice };
    }
  }
  // Apply seller filter through order items
  if (props.body.sellerId !== undefined) {
    whereInput.orderItems = {
      some: {
        shopping_mall_seller_id: props.body.sellerId,
      },
    };
  }
  // Build orderBy clause
  const orderByInput: Prisma.shopping_mall_ordersOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort !== undefined) {
    switch (props.body.sort) {
      case "created_at":
        orderByInput.created_at = "desc";
        break;
      case "created_at_asc":
        orderByInput.created_at = "asc";
        break;
      case "total_price":
        orderByInput.total_price = "asc";
        break;
      case "total_price_desc":
        orderByInput.total_price = "desc";
        break;
      case "status":
        orderByInput.status = "asc";
        break;
      case "status_desc":
        orderByInput.status = "desc";
        break;
    }
  }
  // Query orders with customer relation
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
      shopping_mall_customer_id: true,
      customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      orderItems: {
        select: {
          id: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  // Transform orders with aggregate calculations
  const data = await ArrayUtil.asyncMap(orders, async (order) => {
    // Get order items count
    const orderItemsCount = order.orderItems.length;
    // Get cancellation count
    const cancellationCount =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
        where: {
          shopping_mall_order_item_id: {
            in: order.orderItems.map((oi) => oi.id),
          },
          status: "approved",
          deleted_at: null,
        },
      });
    // Get refund count
    const refundCount =
      await MyGlobal.prisma.shopping_mall_refund_requests.count({
        where: {
          shopping_mall_order_item_id: {
            in: order.orderItems.map((oi) => oi.id),
          },
          status: "approved",
          deleted_at: null,
        },
      });
    // Get shipment IDs for this order's items
    const shipmentItems =
      await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
        where: {
          shopping_mall_order_item_id: {
            in: order.orderItems.map((oi) => oi.id),
          },
        },
        select: { shopping_mall_shipment_id: true },
      });
    const shipmentIds = shipmentItems.map((si) => si.shopping_mall_shipment_id);
    // Get shipment count and max delivered_at
    let shipmentCount = 0;
    let maxDeliveredAt: Date | null = null;
    if (shipmentIds.length > 0) {
      const shipmentStats =
        await MyGlobal.prisma.shopping_mall_shipments.aggregate({
          _count: true,
          _max: { delivered_at: true },
          where: {
            id: { in: shipmentIds },
            deleted_at: null,
          },
        });
      shipmentCount = shipmentStats._count;
      maxDeliveredAt = shipmentStats._max.delivered_at;
    }
    return {
      id: order.id as string & tags.Format<"uuid">,
      total_price: order.total_price,
      status: order.status,
      created_at: toISOStringSafe(order.created_at),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        order.customer,
      ),
      order_items_count: orderItemsCount as number & tags.Type<"int32">,
      cancellation_count: cancellationCount as number & tags.Type<"int32">,
      refund_count: refundCount as number & tags.Type<"int32">,
      shipment_count: shipmentCount as number & tags.Type<"int32">,
      delivered_at: maxDeliveredAt ? toISOStringSafe(maxDeliveredAt) : null,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
