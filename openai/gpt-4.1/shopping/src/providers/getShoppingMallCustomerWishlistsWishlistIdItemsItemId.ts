import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: Verify wishlist exists and belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Step 2: Fetch wishlist item and check that it belongs to the correct wishlist
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      shopping_mall_wishlist_id: true,
      shopping_mall_product_sku_id: true,
      created_at: true,
    },
  });
  if (!item || item.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // Step 3: Fetch product SKU and its product for summary info
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: item.shopping_mall_product_sku_id },
    select: {
      id: true,
      sku_code: true,
      status: true,
      stock: true,
      product: { select: { title: true } },
    },
  });
  if (!sku || !sku.product) {
    throw new HttpException("Product SKU not found", 404);
  }

  // Option summary (not supported in schema: set as empty string)
  const option_summary = "";

  // Compute in-stock flag
  const in_stock = sku.status === "active" && sku.stock > 0;

  return {
    id: item.id,
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: sku.product.title,
      option_summary,
      in_stock,
    },
    created_at: toISOStringSafe(item.created_at),
  };
}
