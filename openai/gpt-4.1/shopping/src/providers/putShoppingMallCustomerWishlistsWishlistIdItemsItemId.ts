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

export async function putShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  // 1. Confirm wishlist exists and is owned by customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });
  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or not owned by customer", 404);
  }

  // 2. Fetch the wishlist item
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.itemId },
    });
  if (
    !wishlistItem ||
    wishlistItem.shopping_mall_wishlist_id !== props.wishlistId
  ) {
    throw new HttpException("Wishlist item not found in this wishlist", 404);
  }

  // 3. If provided, validate new SKU and ensure no duplicate
  let nextSkuId = wishlistItem.shopping_mall_product_sku_id;
  if (props.body.shopping_mall_product_sku_id !== undefined) {
    // Validate SKU exists
    const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: props.body.shopping_mall_product_sku_id },
    });
    if (!sku || sku.deleted_at) {
      throw new HttpException("Product SKU does not exist or is deleted", 404);
    }
    // Enforce uniqueness of (wishlistId, skuId)
    const duplicate =
      await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
        where: {
          shopping_mall_wishlist_id: props.wishlistId,
          shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
          id: { not: wishlistItem.id },
        },
      });
    if (duplicate) {
      throw new HttpException("This SKU is already in the wishlist", 409);
    }
    nextSkuId = props.body.shopping_mall_product_sku_id;
  }

  // 4. Perform the update
  const updatedItem = await MyGlobal.prisma.shopping_mall_wishlist_items.update(
    {
      where: { id: props.itemId },
      data: { shopping_mall_product_sku_id: nextSkuId },
    },
  );

  // 5. Fetch joined SKU summary
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: updatedItem.shopping_mall_product_sku_id },
  });
  if (!sku) {
    throw new HttpException("SKU not found after update", 500);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
  });
  if (!product) {
    throw new HttpException("Product record for SKU not found", 500);
  }
  return {
    id: updatedItem.id,
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: sku.sku_code,
      in_stock:
        sku.stock > 0 && sku.status === "active" && sku.deleted_at === null,
    },
    created_at: toISOStringSafe(updatedItem.created_at),
  };
}
