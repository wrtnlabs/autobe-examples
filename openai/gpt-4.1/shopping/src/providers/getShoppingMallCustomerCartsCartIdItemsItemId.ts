import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  // Ensure cart belongs to customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or access denied.", 404);
  }

  // Find the cart item
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_cart_id: props.cartId,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found.", 404);
  }

  // Fetch SKU
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: cartItem.shopping_mall_product_sku_id },
  });
  if (!sku) {
    throw new HttpException("Product SKU not found for cart item.", 500);
  }

  // Fetch product for product_title
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
  });
  if (!product) {
    throw new HttpException("Product not found for SKU.", 500);
  }

  // Synthesize option_summary (best effort, fallback empty string)
  // Realistically, this is derived from attributes, but as no join in schema, leave empty
  const option_summary = "";
  const in_stock = sku.stock > 0;

  return {
    id: cartItem.id,
    shopping_mall_cart_id: cartItem.shopping_mall_cart_id,
    quantity: cartItem.quantity,
    created_at: toISOStringSafe(cartItem.created_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary,
      in_stock,
    },
  };
}
