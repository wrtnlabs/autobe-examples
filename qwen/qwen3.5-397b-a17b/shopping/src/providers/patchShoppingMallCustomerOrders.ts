import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build base where clause with customer isolation
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  };
  // Apply date range filters - build filter object separately
  const dateFilter: Prisma.DateTimeFilter<"shopping_mall_orders"> = {};
  if (props.body.fromDate !== null && props.body.fromDate !== undefined) {
    dateFilter.gte = new Date(props.body.fromDate);
  }
  if (props.body.toDate !== null && props.body.toDate !== undefined) {
    dateFilter.lte = new Date(props.body.toDate);
  }
  if (dateFilter.gte !== undefined || dateFilter.lte !== undefined) {
    whereInput.created_at = dateFilter;
  }
  // Apply order number partial match
  if (props.body.orderNumber !== undefined) {
    whereInput.order_number = {
      contains: props.body.orderNumber,
    };
  }
  // Apply price range filters - build filter object separately
  const priceFilter: Prisma.FloatFilter<"shopping_mall_orders"> = {};
  if (props.body.minPrice !== undefined) {
    priceFilter.gte = props.body.minPrice;
  }
  if (props.body.maxPrice !== undefined) {
    priceFilter.lte = props.body.maxPrice;
  }
  if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
    whereInput.total_price = priceFilter;
  }
  // Fetch orders with their items to compute status
  // We need to fetch items to compute status for filtering
  const allOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      order_number: true,
      total_price: true,
      created_at: true,
      items: {
        where: {
          deleted_at: null,
        },
        select: {
          status: true,
        },
      },
    },
  });
  // Filter by status if provided (computed status)
  let filteredOrders = allOrders;
  if (props.body.status !== undefined) {
    filteredOrders = allOrders.filter((order) => {
      const status = computeOrderStatus(order.items.map((item) => item.status));
      return status === props.body.status;
    });
  }
  // Apply pagination after status filtering
  const total = filteredOrders.length;
  const skip = (page - 1) * limit;
  const paginatedOrders = filteredOrders.slice(skip, skip + limit);
  // Transform to summary format
  const data = paginatedOrders.map((order) => {
    const status = computeOrderStatus(order.items.map((item) => item.status));
    return {
      id: order.id as string & tags.Format<"uuid">,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      createdAt: toISOStringSafe(order.created_at),
      status,
    } satisfies IShoppingMallOrder.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallOrder.ISummary;
}
function computeOrderStatus(
  itemStatuses: string[],
): IShoppingMallOrder.ISummary["status"] {
  if (itemStatuses.length === 0) {
    return "PAID";
  }
  const allSame = itemStatuses.every((s) => s === itemStatuses[0]);
  if (allSame) {
    const status = itemStatuses[0];
    if (status === "PAID") return "PAID";
    if (status === "SHIPPED") return "SHIPPED";
    if (status === "DELIVERED") return "DELIVERED";
    if (status === "CANCELLED") return "CANCELLED";
    if (status === "REFUNDED") return "REFUNDED";
  }
  // Check for shipped (any shipped, none delivered)
  const hasShipped = itemStatuses.some((s) => s === "SHIPPED");
  const hasDelivered = itemStatuses.some((s) => s === "DELIVERED");
  if (hasShipped && !hasDelivered) {
    return "SHIPPED";
  }
  // Mixed statuses
  return "PARTIALLY_COMPLETED";
}
