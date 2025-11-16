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
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    customer_id: props.customer.id,
    ...(props.body.status_filter ? { status: props.body.status_filter } : {}),
    ...(props.body.payment_state
      ? { payment_state: props.body.payment_state }
      : {}),
    ...(props.body.search_text
      ? {
          OR: [
            {
              order_number: {
                contains: props.body.search_text,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {}),
    ...(props.body.date_from || props.body.date_to
      ? {
          created_at: {
            ...(props.body.date_from ? { gte: props.body.date_from } : {}),
            ...(props.body.date_to ? { lte: props.body.date_to } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: props.body.order_by
        ? {
            [props.body.order_by]: props.body.order_direction ?? "desc",
          }
        : { created_at: "desc" },
      include: {
        customer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where: whereCondition }),
  ]);

  return {
    data: data.map((order) => ({
      id: order.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      customer: {
        id: order.customer.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        name: order.customer.name,
        email: order.customer.email,
      },
      seller: null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}
