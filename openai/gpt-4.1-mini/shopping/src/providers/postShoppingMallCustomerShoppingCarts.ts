import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemSelectedOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSelectedOptions";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCart.ICreate;
}): Promise<IShoppingMallShoppingCart> {
  const created = await MyGlobal.prisma.shopping_mall_shopping_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: null,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      // 'items' removed because it is not a known property
    },
  });

  return {
    id: created.id,
    customer_id: created.shopping_mall_customer_id,
    session_id:
      created.shopping_mall_customer_session_id === null
        ? null
        : created.shopping_mall_customer_session_id,
    status: "active", // added since required by IShoppingMallShoppingCart
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
