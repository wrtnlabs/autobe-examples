import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const { customer, body } = props;

  // Default pagination with minimum values
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 100;
  const page = Number(pageRaw) < 1 ? 1 : Number(pageRaw);
  const limit = Number(limitRaw) < 1 ? 100 : Number(limitRaw);
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    shopping_mall_customer_id: customer.id,
    ...(body.shopping_mall_seller_id !== undefined &&
      body.shopping_mall_seller_id !== null && {
        shopping_mall_seller_id: body.shopping_mall_seller_id,
      }),
    ...(body.order_number !== undefined &&
      body.order_number !== null && {
        order_number: { contains: body.order_number },
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.payment_method !== undefined &&
      body.payment_method !== null && { payment_method: body.payment_method }),
    ...((body.from_created_at !== undefined && body.from_created_at !== null) ||
    (body.to_created_at !== undefined && body.to_created_at !== null)
      ? {
          created_at: {
            ...(body.from_created_at !== undefined &&
              body.from_created_at !== null && { gte: body.from_created_at }),
            ...(body.to_created_at !== undefined &&
              body.to_created_at !== null && { lte: body.to_created_at }),
          },
        }
      : {}),
    ...((body.from_updated_at !== undefined && body.from_updated_at !== null) ||
    (body.to_updated_at !== undefined && body.to_updated_at !== null)
      ? {
          updated_at: {
            ...(body.from_updated_at !== undefined &&
              body.from_updated_at !== null && { gte: body.from_updated_at }),
            ...(body.to_updated_at !== undefined &&
              body.to_updated_at !== null && { lte: body.to_updated_at }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { order_number: { contains: body.search } },
          { shipping_address: { contains: body.search } },
        ],
      }),
  };

  const [orders, totalRecords] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        business_status: true,
        payment_method: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where,
    }),
  ]);

  const data = orders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    total_price: order.total_price,
    status: order.status,
    business_status: order.business_status,
    payment_method: order.payment_method,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
  }));

  const pages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages,
    },
    data,
  };
}
