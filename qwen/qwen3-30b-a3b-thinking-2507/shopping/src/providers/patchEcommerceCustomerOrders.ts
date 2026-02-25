import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
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

export async function patchEcommerceCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IPageIEcommerceOrder.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, props.body.limit ?? 20);
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_orders.findMany({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
        status: props.body.status,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        total_amount: true,
        created_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            email_verified: true,
            created_at: true,
          },
        },
        shippingAddress: {
          select: {
            id: true,
            street_address: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_orders.count({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
        status: props.body.status,
      },
    }),
  ]);
  const orderSummaries = await ArrayUtil.asyncMap(orders, async (order) => ({
    id: order.id,
    status: order.status,
    total_amount: order.total_amount,
    created_at: toISOStringSafe(order.created_at),
    shippingAddress: {
      id: order.shippingAddress.id,
      street_address: order.shippingAddress.street_address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postal_code: order.shippingAddress.postal_code,
      country: order.shippingAddress.country,
      is_default: order.shippingAddress.is_default,
      created_at: toISOStringSafe(order.shippingAddress.created_at),
      updated_at: toISOStringSafe(order.shippingAddress.updated_at),
      deleted_at: order.shippingAddress.deleted_at
        ? toISOStringSafe(order.shippingAddress.deleted_at)
        : null,
    },
    customer: {
      id: order.customer.id,
      email: order.customer.email,
      emailVerified: order.customer.email_verified,
      isSuspended: false,
      createdAt: toISOStringSafe(order.customer.created_at),
    },
  }));
  return {
    data: orderSummaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
