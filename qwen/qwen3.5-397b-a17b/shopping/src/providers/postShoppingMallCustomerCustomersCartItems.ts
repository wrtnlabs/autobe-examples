import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_product_variant_id },
      select: { id: true, stock_quantity: true, deleted: true },
    });
  if (variant.deleted) {
    throw new HttpException("Variant is deleted", 400);
  }
  // Find or create customer's cart
  let cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: { shopping_customer_id: props.customer.id },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        shopping_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Check if cart item already exists for this variant
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        shopping_mall_cart_id: cart.id,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
      },
    },
  );
  if (existingItem) {
    // Update: combine quantities
    const newQuantity = existingItem.quantity + props.body.quantity;
    // Validate total quantity against stock
    if (newQuantity > variant.stock_quantity) {
      throw new HttpException("Quantity exceeds available stock", 400);
    }
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date(),
        available: newQuantity <= variant.stock_quantity,
      },
    });
    const updated =
      await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
        where: { id: existingItem.id },
        ...ShoppingMallCartItemTransformer.select(),
      });
    return await ShoppingMallCartItemTransformer.transform(updated);
  } else {
    // Create: validate quantity against stock
    if (props.body.quantity > variant.stock_quantity) {
      throw new HttpException("Quantity exceeds available stock", 400);
    }
    const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: await ShoppingMallCartItemCollector.collect({
        body: props.body,
        shoppingMallCarts: { id: cart.id },
      }),
      ...ShoppingMallCartItemTransformer.select(),
    });
    return await ShoppingMallCartItemTransformer.transform(created);
  }
}
