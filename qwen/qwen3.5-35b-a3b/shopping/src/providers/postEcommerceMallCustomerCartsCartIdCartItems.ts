import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartsCartIdCartItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Validate cart ownership and status
  const cart =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: { id: true, customer_id: true },
    });
  if (cart.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate customer is not banned
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { is_banned: true },
    });
  if (customer.is_banned) {
    throw new HttpException("Customer account is banned", 403);
  }
  // Check for existing cart item to merge quantities
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        cart_id: props.cartId,
        variant_id: props.body.variant_id,
        deleted_at: null,
      },
      select: { id: true, quantity: true, created_at: true },
    });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (existingItem !== null) {
    // Merge quantities with existing item
    const newQuantity = existingItem.quantity + props.body.quantity;
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Update cart timestamp
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
      where: { id: props.cartId },
      data: { updated_at: now },
    });
    // Return updated cart item
    const updatedItem =
      await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
        where: { id: existingItem.id },
        ...EcommerceMallCartItemTransformer.select(),
      });
    return await EcommerceMallCartItemTransformer.transform(updatedItem);
  }
  // Create new cart item using collector
  const created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
    data: await EcommerceMallCartItemCollector.collect({
      body: props.body,
      ecommerceMallShoppingCarts: {
        id: props.cartId,
      } as any,
    }),
    ...EcommerceMallCartItemTransformer.select(),
  });
  // Update cart timestamp
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
    where: { id: props.cartId },
    data: { updated_at: now },
  });
  return await EcommerceMallCartItemTransformer.transform(created);
}
