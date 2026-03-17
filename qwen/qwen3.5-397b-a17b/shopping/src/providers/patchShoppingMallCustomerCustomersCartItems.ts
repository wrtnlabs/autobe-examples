import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCustomersCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IBulkUpdate;
}): Promise<IShoppingMallCart> {
  // Find customer's active cart
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Process each update in the bulk request
  // Each update element has { id: string, quantity?: number } structure
  for (const itemUpdate of props.body.updates) {
    const cartItemId = (
      itemUpdate as unknown as {
        id: string & tags.Format<"uuid">;
      }
    ).id;
    const newQuantity = itemUpdate.quantity;
    // Find the cart item and verify it belongs to customer's cart
    const cartItem =
      await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
        where: {
          id: cartItemId,
          shopping_mall_cart_id: cart.id,
        },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
        },
      });
    // Get the variant to check stock and deletion status
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: cartItem.shopping_mall_product_variant_id },
        select: {
          id: true,
          deleted: true,
          stock_quantity: true,
        },
      });
    // If quantity is 0 or undefined, remove the item from cart
    if (newQuantity === 0 || newQuantity === undefined) {
      await MyGlobal.prisma.shopping_mall_cart_items.delete({
        where: { id: cartItemId },
      });
    } else {
      // Validate quantity is at least 1
      if (newQuantity < 1) {
        throw new HttpException("Quantity must be at least 1", 400);
      }
      // Validate quantity does not exceed available stock
      if (newQuantity > variant.stock_quantity) {
        throw new HttpException(
          `Requested quantity ${newQuantity} exceeds available stock ${variant.stock_quantity}`,
          400,
        );
      }
      // Check if variant is deleted or out of stock
      const available = !variant.deleted && variant.stock_quantity > 0;
      // Update the cart item
      await MyGlobal.prisma.shopping_mall_cart_items.update({
        where: { id: cartItemId },
        data: {
          quantity: newQuantity,
          available: available,
          updated_at: new Date(),
        },
      });
    }
  }
  // Update cart's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cart.id },
    data: {
      updated_at: new Date(),
    },
  });
  // Return complete cart with updated items using transformer
  const updatedCart =
    await MyGlobal.prisma.shopping_mall_carts.findUniqueOrThrow({
      where: { id: cart.id },
      ...ShoppingMallCartTransformer.select(),
    });
  return await ShoppingMallCartTransformer.transform(updatedCart);
}
