import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCartItemCollector } from "../collectors/EcommerceCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemTransformer } from "../transformers/EcommerceCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.ICreate;
}): Promise<IEcommerceCartItem> {
  // Validate cart exists and belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findUnique({
    where: { id: props.cartId, customer_id: props.customer.id },
  });
  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // Check product variant exists and has sufficient stock
  const productVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUnique({
      where: { id: props.body.product_variant_id, deleted_at: null },
      include: { product: true },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  if (productVariant.quantity < props.body.quantity) {
    throw new HttpException("Insufficient stock", 400);
  }
  // Check if variant already exists in cart
  const existingCartItem = await MyGlobal.prisma.ecommerce_cart_items.findFirst(
    {
      where: {
        shopping_cart_id: props.cartId,
        product_variant_id: props.body.product_variant_id,
        deleted_at: null,
      },
    },
  );
  let cartItem;
  if (existingCartItem) {
    // Combine quantities
    const newQuantity = existingCartItem.quantity + props.body.quantity;
    if (productVariant.quantity < newQuantity) {
      throw new HttpException("Combined quantity exceeds available stock", 400);
    }
    cartItem = await MyGlobal.prisma.ecommerce_cart_items.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date(),
      },
      ...EcommerceCartItemTransformer.select(),
    });
  } else {
    // Create new cart item
    cartItem = await MyGlobal.prisma.ecommerce_cart_items.create({
      data: await EcommerceCartItemCollector.collect({
        body: props.body,
        shoppingCartId: props.cartId,
        productId: productVariant.product.id,
      }),
      ...EcommerceCartItemTransformer.select(),
    });
  }
  // Update cart's updated_at timestamp
  await MyGlobal.prisma.ecommerce_shopping_carts.update({
    where: { id: props.cartId },
    data: { updated_at: new Date() },
  });
  return await EcommerceCartItemTransformer.transform(cartItem);
}
