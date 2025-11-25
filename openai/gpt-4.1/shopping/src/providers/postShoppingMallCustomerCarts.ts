import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  // Check if a cart already exists for this customer
  const existingCart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (existingCart) {
    throw new HttpException(
      "A cart for this customer already exists. Only one active cart is allowed per customer.",
      409,
    );
  }

  // Find the customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      id: props.customer.id,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found.", 404);
  }

  const now = toISOStringSafe(new Date());

  // Create the cart
  const cart = await MyGlobal.prisma.shopping_mall_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: cart.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
  };
}
