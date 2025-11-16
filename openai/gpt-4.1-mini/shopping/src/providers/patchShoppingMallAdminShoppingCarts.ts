import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingCarts(props: {
  admin: AdminPayload;
  body: IShoppingMallShoppingCart.IRequest;
}): Promise<IPageIShoppingMallShoppingCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_shopping_cartsWhereInput = {
    deleted_at: null,
  };

  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";

  const carts = await MyGlobal.prisma.shopping_mall_shopping_carts.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [orderByField]: orderDirection },
  });

  const total = await MyGlobal.prisma.shopping_mall_shopping_carts.count({
    where,
  });

  const customerIds = carts.map((cart) => cart.shopping_mall_customer_id);
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: { id: { in: customerIds } },
  });

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: carts.map((cart) => {
      const customer = customerMap.get(cart.shopping_mall_customer_id);
      return {
        id: cart.id,
        customer: {
          id: customer?.id ?? "",
          email: customer?.email ?? "",
          name: customer?.name ?? "",
          status: "",
          created_at:
            customer && customer.created_at
              ? toISOStringSafe(customer.created_at)
              : "",
          updated_at: customer?.updated_at
            ? toISOStringSafe(customer.updated_at)
            : undefined,
        },
        items_count: 0,
      };
    }),
  };
}
