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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Step 1: Validate customer owns this cart item
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_cart_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        cart: {
          select: {
            shopping_customer_id: true,
          },
        },
      },
    });
  // Verify ownership
  if (cartItem.cart.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Get current variant stock to validate quantity
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: cartItem.shopping_mall_product_variant_id },
      select: {
        stock_quantity: true,
      },
    });
  // Validate requested quantity against stock
  const newQuantity = props.body.quantity ?? cartItem.quantity;
  if (newQuantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  if (newQuantity > variant.stock_quantity) {
    throw new HttpException("Requested quantity exceeds available stock", 400);
  }
  // Step 3: Update the cart item
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.itemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      available: variant.stock_quantity >= newQuantity,
      updated_at: new Date(),
    },
  });
  // Step 4: Return updated cart item with full details
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
