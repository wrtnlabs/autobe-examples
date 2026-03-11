import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Step 1: Validate cart belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findFirst({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  // Step 2: Validate variant exists, is active
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.body.variant_id,
        is_active: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found or inactive", 404);
  }
  // Check stock availability
  if (variant.stock_quantity < props.body.quantity) {
    throw new HttpException("Insufficient stock for requested quantity", 400);
  }
  // Step 3: Check if variant already exists in cart
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        cart_id: props.cartId,
        variant_id: props.body.variant_id,
        deleted_at: null,
      },
    });
  let cartItem: {
    id: string;
    quantity: number;
    price: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    cart_id: string;
    variant_id: string;
  };
  if (existingItem) {
    // Step 4: Merge quantities - update existing item
    const newQuantity = existingItem.quantity + props.body.quantity;
    const updatedItem = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: newQuantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    cartItem = updatedItem;
  } else {
    // Step 5: Create new cart item
    const newId: string & tags.Format<"uuid"> = v4();
    cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: {
        id: newId,
        quantity: props.body.quantity,
        price: variant.price_override ?? 0,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
        cart_id: cart.id,
        variant_id: props.body.variant_id,
      },
    });
  }
  // Step 6: Update cart's updated_at timestamp
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
    where: {
      id: cart.id,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Step 7: Return cart item with full relations using transformer
  const result =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: {
        id: cartItem.id,
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return await EcommerceMallCartItemTransformer.transform(result);
}
