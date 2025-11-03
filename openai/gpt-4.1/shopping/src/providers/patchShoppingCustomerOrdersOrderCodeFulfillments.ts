import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { IPageIShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderFulfillment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrdersOrderCodeFulfillments(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrderFulfillment.IRequest;
}): Promise<IPageIShoppingOrderFulfillment> {
  const { customer, orderCode, body } = props;

  // Step 1: Find the order belonging to the requesting customer
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      shopping_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Step 2: Get all order lines for the order
  const orderLineIds = (
    await MyGlobal.prisma.shopping_order_lines.findMany({
      where: {
        shopping_order_id: order.id,
        deleted_at: null,
      },
      select: { id: true },
    })
  ).map((line) => line.id);

  if (orderLineIds.length === 0) {
    return {
      pagination: {
        current: Number(body.page),
        limit: Number(body.limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 3: Build filter for fulfillments, including flexible fulfilled_at filter
  let fulfilledAt: { gte?: string; lte?: string } = {};
  if (body.from !== undefined && body.from !== null) {
    fulfilledAt.gte = body.from;
  }
  if (body.to !== undefined && body.to !== null) {
    fulfilledAt.lte = body.to;
  }
  const fulfillmentWhere = {
    shopping_order_line_id: { in: orderLineIds },
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(Object.keys(fulfilledAt).length > 0 && { fulfilled_at: fulfilledAt }),
  };

  // Step 4: Pagination calculation
  const skip = (Number(body.page) - 1) * Number(body.limit);
  const take = Number(body.limit);

  // Step 5: Fetch data and total count
  const [fulfillments, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: fulfillmentWhere,
      orderBy: { fulfilled_at: "desc" },
      skip: skip,
      take: take,
    }),
    MyGlobal.prisma.shopping_order_fulfillments.count({
      where: fulfillmentWhere,
    }),
  ]);

  // Step 6: Mapping results to IShoppingOrderFulfillment structure
  const data = fulfillments.map((f) => ({
    id: f.id,
    shopping_order_line_id: f.shopping_order_line_id,
    shopping_seller_id: f.shopping_seller_id,
    shopping_seller_address_id: f.shopping_seller_address_id,
    fulfillment_code: f.fulfillment_code,
    quantity_fulfilled: f.quantity_fulfilled,
    fulfilled_at: toISOStringSafe(f.fulfilled_at),
    status: f.status,
    note: f.note !== undefined ? f.note : undefined,
    created_at: toISOStringSafe(f.created_at),
    updated_at: toISOStringSafe(f.updated_at),
  }));

  // Step 7: Pagination meta
  const pages = take > 0 ? Math.ceil(total / take) : 0;

  return {
    pagination: {
      current: Number(body.page),
      limit: Number(body.limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
