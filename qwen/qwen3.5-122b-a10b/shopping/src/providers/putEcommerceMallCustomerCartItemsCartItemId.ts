import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemAtSummaryTransformer } from "../transformers/EcommerceMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Step 1: Find cart item and verify it exists and is not deleted
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: {
      id: true,
      customer_id: true,
      product_variant_id: true,
      quantity: true,
      is_available: true,
      added_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Step 2: Check if cart item exists and is not deleted
  if (cartItem === null || cartItem.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Step 3: Verify cart item belongs to authenticated customer
  if (cartItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch product variant for stock validation
  const productVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: cartItem.product_variant_id },
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        deleted_at: true,
      },
    });
  // Step 5: Check if product variant exists and is not deleted
  if (productVariant === null || productVariant.deleted_at !== null) {
    throw new HttpException("Product variant not found", 404);
  }
  // Step 6: Validate quantity if provided in request body
  const newQuantity = props.body.quantity ?? cartItem.quantity;
  if (newQuantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  // Step 7: Check stock availability and determine is_available status
  const isAvailable = newQuantity <= productVariant.stock_quantity;
  if (!isAvailable) {
    throw new HttpException(
      `Requested quantity ${newQuantity} exceeds available stock ${productVariant.stock_quantity}`,
      400,
    );
  }
  // Step 8: Update cart item quantity and timestamp
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: newQuantity,
      is_available: isAvailable,
      updated_at: new Date(),
    },
  });
  // Step 9: Fetch full cart for the customer
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  // Step 10: Transform cart items and calculate total
  const items = await Promise.all(
    cartItems.map(async (item) =>
      EcommerceMallCartItemAtSummaryTransformer.transform(item),
    ),
  );
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    items,
    total,
  };
}
