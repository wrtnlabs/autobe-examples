import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallShoppingCartTransformer } from "../transformers/EcommerceMallShoppingCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCarts(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallShoppingCart> {
  // Verify customer is not banned
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      is_banned: false,
      deleted_at: null,
    },
  });
  if (!customer) {
    throw new HttpException("Customer account is banned or not found", 403);
  }
  // Check if customer already has an active cart
  const existingCart =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findFirst({
      where: {
        customer_id: props.customer.id,
      },
      include: {
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        cartItems: true,
      },
    });
  // If customer already has a cart, return it
  if (existingCart) {
    return await EcommerceMallShoppingCartTransformer.transform(existingCart);
  }
  // Create new cart within transaction
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: props.customer.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      cartItems: { create: [] },
    },
    include: {
      customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      cartItems: true,
    },
  });
  return await EcommerceMallShoppingCartTransformer.transform(cart);
}
