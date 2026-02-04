import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallCustomerCartMeMetrics(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCartItem> {
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.groupBy({
    by: ["shopping_mall_customer_id"],
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    _sum: {
      price_at_time: true,
    },
    _count: {
      id: true,
    },
  });
  if (cartItems.length === 0 || !cartItems[0]) {
    return {
      totalAbandonedCarts: 0,
      averageCartValue: 0,
      abandonmentRate: 0,
      averageTimeToAbandonment: 0,
    };
  }
  const totalAbandonedCarts = cartItems[0]._count.id || 0;
  const totalValue = cartItems[0]._sum?.price_at_time || 0;
  const averageCartValue =
    totalAbandonedCarts > 0 ? totalValue / totalAbandonedCarts : 0;
  return {
    totalAbandonedCarts: totalAbandonedCarts satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    averageCartValue: averageCartValue satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    abandonmentRate: 0,
    averageTimeToAbandonment: 0,
  };
}
