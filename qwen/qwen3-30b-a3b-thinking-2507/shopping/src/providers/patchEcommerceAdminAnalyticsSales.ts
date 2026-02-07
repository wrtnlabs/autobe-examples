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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAnalyticsSales(props: {
  admin: AdminPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IPageIEcommerceOrder.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    status: { in: ["delivered", "processing"] },
    deleted_at: null,
  } satisfies Prisma.ecommerce_ordersWhereInput;
  const orders = await MyGlobal.prisma.ecommerce_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
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
  const data = await Promise.all(
    orders.map(async (order) => {
      return {
        id: order.id,
        order_date: toISOStringSafe(order.order_date),
        status: order.status,
        customer: {
          id: order.customer.id,
          email: order.customer.email,
          display_name: order.customer.display_name,
          phone: order.customer.phone,
          created_at: toISOStringSafe(order.customer.created_at),
        } as IEcommerceCustomer.ISummary,
      } as IEcommerceOrder.ISummary;
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  } as IPageIEcommerceOrder.ISummary;
}
