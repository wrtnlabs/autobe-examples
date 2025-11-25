import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
  };

  if (props.body.search) {
    where.OR = [
      { order_number: { contains: props.body.search } },
      { order_status: { contains: props.body.search } },
      { payment_status: { contains: props.body.search } },
    ];
  }

  const validSortFields = [
    "created_at",
    "order_number",
    "total_amount",
  ] as const;
  const sortBy = validSortFields.includes(props.body.sortBy ?? ("" as any))
    ? (props.body.sortBy as (typeof validSortFields)[number])
    : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  const customerIds = [
    ...new Set(orders.map((o) => o.shopping_mall_customer_id)),
  ];
  const sellerIds = [...new Set(orders.map((o) => o.shopping_mall_seller_id))];

  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: { id: { in: customerIds } },
  });
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
  });

  const customerMap = new Map(
    customers.map((c) => [
      c.id,
      {
        id: c.id,
        email: c.email,
        name: "", // No name field in schema, so empty string
      },
    ]),
  );
  const sellerMap = new Map(
    sellers.map((s) => [
      s.id,
      {
        id: s.id,
        name: "", // No name field in schema, so empty string
      },
    ]),
  );

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: orders.map((order) => {
      const shopping_mall_customer = customerMap.get(
        order.shopping_mall_customer_id,
      );
      const shopping_mall_seller = sellerMap.get(order.shopping_mall_seller_id);

      return {
        id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        shipping_address: order.shipping_address,
        created_at: toISOStringSafe(order.created_at),
        updated_at: toISOStringSafe(order.updated_at),
        deleted_at:
          order.deleted_at === null
            ? undefined
            : toISOStringSafe(order.deleted_at),
        shopping_mall_customer: shopping_mall_customer ?? {
          id: order.shopping_mall_customer_id,
          email: "",
          name: "",
        },
        shopping_mall_seller: shopping_mall_seller ?? {
          id: order.shopping_mall_seller_id,
          name: "",
        },
      };
    }),
  };
}
