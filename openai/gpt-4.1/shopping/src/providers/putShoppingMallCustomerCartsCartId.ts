import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updatePayload: Record<string, unknown> = {};
  if (props.body.updated_at !== undefined) {
    updatePayload.updated_at = props.body.updated_at;
  }

  const updated = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: updatePayload,
  });

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.shopping_mall_customer_id },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new HttpException("Customer for cart not found", 500);
  }

  return {
    id: updated.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
