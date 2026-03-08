import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrder.ISummary> {
  // Pagination parameters with defaults and bounds checking
  const page = Math.max(props.body.page ?? 0, 0);
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = page * limit;
  // Validate status against allowed enum values
  if (
    props.body.status !== undefined &&
    ![
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(props.body.status)
  ) {
    throw new HttpException("Invalid order status", 400);
  }
  // Build where clause with customer filter and soft delete check
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.orderNumber && {
      order_number: {
        contains: props.body.orderNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  // Map sort field to Prisma field names
  const sortField =
    props.body.sort === "total_price" || props.body.sort === "status"
      ? props.body.sort
      : "created_at";
  // Build order by with defaults
  const orderByInput: Prisma.ecommerce_mall_ordersOrderByWithRelationInput = {
    [sortField]: (props.body.order ?? "desc") as "asc" | "desc",
    id: "desc",
  } satisfies Prisma.ecommerce_mall_ordersOrderByWithRelationInput;
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  // Fetch paginated orders with transformer select
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderAtSummaryTransformer.select(),
  });
  // Transform orders to DTO format
  const data = await ArrayUtil.asyncMap(
    orders,
    EcommerceMallOrderAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page + 1,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallOrder.ISummary;
}
