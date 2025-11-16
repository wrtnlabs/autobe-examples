import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderNumber(props: {
  admin: AdminPayload;
  orderNumber: string;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
    include: {
      customer: true,
      address: true,
      seller: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: undefined,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
    },
    address: {
      id: order.address.id,
      full_name: order.address.full_name,
      street: order.address.street,
      city: order.address.city,
      province: order.address.province,
      postal_code: order.address.postal_code,
      country: order.address.country,
      phone: order.address.phone,
      is_default: order.address.is_default,
    },
    seller: {
      id: order.seller.id,
      business_name: order.seller.business_name,
    },
    items_count: undefined,
    shipments_count: undefined,
  };
}
