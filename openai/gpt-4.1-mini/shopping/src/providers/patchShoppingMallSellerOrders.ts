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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const { seller, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    shopping_mall_seller_id: seller.id,
    ...(body.shopping_mall_customer_id !== undefined &&
      body.shopping_mall_customer_id !== null && {
        shopping_mall_customer_id: body.shopping_mall_customer_id,
      }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.business_status !== undefined && {
      business_status: body.business_status,
    }),
    ...(body.payment_method !== undefined && {
      payment_method: body.payment_method,
    }),
    ...(body.order_number !== undefined && {
      order_number: body.order_number,
    }),
    // Created date range filter
    ...((body.from_created_at !== undefined && body.from_created_at !== null) ||
    (body.to_created_at !== undefined && body.to_created_at !== null)
      ? {
          created_at: {
            ...(body.from_created_at !== undefined &&
              body.from_created_at !== null && {
                gte: body.from_created_at,
              }),
            ...(body.to_created_at !== undefined &&
              body.to_created_at !== null && {
                lte: body.to_created_at,
              }),
          },
        }
      : {}),
    // Updated date range filter
    ...((body.from_updated_at !== undefined && body.from_updated_at !== null) ||
    (body.to_updated_at !== undefined && body.to_updated_at !== null)
      ? {
          updated_at: {
            ...(body.from_updated_at !== undefined &&
              body.from_updated_at !== null && {
                gte: body.from_updated_at,
              }),
            ...(body.to_updated_at !== undefined &&
              body.to_updated_at !== null && {
                lte: body.to_updated_at,
              }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_ordersWhereInput;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  const results = data.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    total_price: order.total_price,
    status: order.status,
    business_status: order.business_status,
    payment_method: order.payment_method,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
