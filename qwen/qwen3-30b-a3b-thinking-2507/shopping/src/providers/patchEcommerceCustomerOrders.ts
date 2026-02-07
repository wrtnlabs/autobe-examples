import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
  const cursor = undefined;
  const limit = 10;
  const whereInput: Prisma.ecommerce_ordersWhereInput = {
    deleted_at: null,
    customer: {
      id: props.customer.id,
    },
  };
  const data = await MyGlobal.prisma.ecommerce_orders.findMany({
    where: whereInput,
    take: limit,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { order_date: "desc" },
    select: {
      id: true,
      order_date: true,
      status: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_orders.count({
    where: whereInput,
  });
  const formattedData = data.map((order) => ({
    id: order.id,
    order_date: toISOStringSafe(order.order_date),
    status: order.status,
    customer: {
      id: order.customer.id,
      email: order.customer.email,
      display_name: order.customer.display_name,
      phone: order.customer.phone,
      created_at: toISOStringSafe(order.customer.created_at),
    },
  }));
  return {
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: formattedData,
  };
}
