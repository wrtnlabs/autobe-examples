import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: Validate wishlist belongs to customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });
  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // Step 2: Validate SKU exists and is active (not deleted)
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.body.shopping_mall_product_sku_id,
      deleted_at: null,
    },
    include: {
      product: true,
    },
  });
  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  // Step 3: Attempt to insert wishlist item
  let item;
  try {
    item = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
      data: {
        id: v4(),
        shopping_mall_wishlist_id: props.wishlistId,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
        created_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("SKU is already in the wishlist", 409);
    }
    throw err;
  }

  // Step 4: Prepare productSku summary for response
  const in_stock =
    sku.status === "active" && sku.stock > 0 && sku.deleted_at === null;
  return {
    id: item.id,
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: sku.product.title,
      option_summary: "",
      in_stock: in_stock,
    },
    created_at: item.created_at
      ? toISOStringSafe(item.created_at)
      : toISOStringSafe(new Date()),
  };
}
