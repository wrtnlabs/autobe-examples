import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartHistory";
import { IShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartHistory";
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

export async function getShoppingMallCustomerCartsCartIdHistory(props: {
  customer: CustomerPayload;
  cartId: string;
}): Promise<IPageIShoppingMallCartHistory> {
  const historyRecords =
    await MyGlobal.prisma.shopping_mall_cart_histories.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        cart: {
          customer: {
            id: props.customer.id,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: 0,
      take: 100,
    });
  const total = await MyGlobal.prisma.shopping_mall_cart_histories.count({
    where: {
      shopping_mall_cart_id: props.cartId,
      cart: {
        customer: {
          id: props.customer.id,
        },
      },
    },
  });
  return {
    data: historyRecords,
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
  };
}
