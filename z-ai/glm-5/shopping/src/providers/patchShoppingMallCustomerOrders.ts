import { IEShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallOrderStatus";
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
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search && {
      order_number: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      order_number: true,
      total_price: true,
      status: true,
      created_at: true,
      customer: ShoppingMallCustomerAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(orders, async (order) => ({
    id: order.id,
    order_number: order.order_number,
    total_price: order.total_price,
    status: order.status,
    created_at: order.created_at.toISOString(),
    customer: order.customer
      ? await ShoppingMallCustomerAtSummaryTransformer.transform(order.customer)
      : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallOrder.ISummary;
}
