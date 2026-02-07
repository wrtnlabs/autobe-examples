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
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Log search parameters for analytics
  console.log("Search parameters:", {
    customer_id: props.customer.id,
    page,
    limit,
  });
  // Build query filters
  const where: Prisma.shopping_mall_ordersWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    created_at: {},
    total_amount: {},
  };
  // Build order by with full support
  const orderBy: Prisma.shopping_mall_ordersOrderByWithRelationInput = {
    // Default
    created_at: "desc",
  };
  // Get data with customer_email from relation
  const data = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      order_number: true,
      status: true,
      total_amount: true,
      created_at: true,
      customer_id: true,
      customer: {
        select: {
          email: true,
        },
      },
    },
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_orders.count({ where });
  // Transform to summary — ensure string & tags.Format<'date-time'> production
  const summaryData = data.map((item) => ({
    id: item.id,
    order_number: item.order_number,
    status: item.status,
    total_amount: item.total_amount,
    created_at: toISOStringSafe(item.created_at),
    customer_id: item.customer_id,
    customer_email: item.customer.email,
    order_item_count: 0, // As per spec: do not join order_items
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
