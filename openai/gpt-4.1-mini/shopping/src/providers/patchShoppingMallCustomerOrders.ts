import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  if (
    props.body.shoppingMallCustomerId &&
    props.body.shoppingMallCustomerId !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.orderStatus ? { order_status: props.body.orderStatus } : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lt: props.body.createdAtTo } }
      : {}),
  };
  if (props.body.shoppingMallSellerId) {
    where.orderItems = {
      some: {
        saleUnits: {
          some: {
            sale: {
              shopping_mall_seller_id: props.body.shoppingMallSellerId,
              deleted_at: null,
            },
            deleted_at: null,
          },
        },
        deleted_at: null,
      },
    };
  }
  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        order_number: true,
        total_price: true,
        total_quantity: true,
        order_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
  ]);
  return {
    pagination: {
      current: page satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> as number,
      limit: limit satisfies number & tags.Type<"int32"> as number,
      records: total satisfies number & tags.Type<"int32"> as number,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> as number,
    },
    data: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      totalQuantity: order.total_quantity satisfies number &
        tags.Type<"int32"> as number,
      orderStatus: order.order_status,
      createdAt: toISOStringSafe(order.created_at),
      updatedAt: toISOStringSafe(order.updated_at),
      deletedAt: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        displayName: order.customer.display_name ?? null,
        phoneNumber: order.customer.phone_number ?? null,
        createdAt: toISOStringSafe(order.customer.created_at),
        updatedAt: toISOStringSafe(order.customer.updated_at),
      } satisfies IShoppingMallCustomer.ISummary,
    })),
  } satisfies IPageIShoppingMallOrder.ISummary;
}
