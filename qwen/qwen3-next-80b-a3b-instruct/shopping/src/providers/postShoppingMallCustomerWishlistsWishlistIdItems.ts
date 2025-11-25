import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // Validate wishlist belongs to customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // Validate product variant exists and is active
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.body,
        deleted_at: null,
      },
    });

  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }

  // Create wishlist item with system-generated id and timestamps
  try {
    const createdItem =
      await MyGlobal.prisma.shopping_mall_wishlist_items.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_wishlist_id: props.wishlistId,
          shopping_mall_product_variant_id: props.body,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });

    // Return formatted response matching IShoppingMallWishlistItem
    // Use the wishlist's customer_id from the pre-fetched object
    return {
      id: createdItem.id,
      customerId: wishlist.shopping_mall_customer_id,
      wishlistId: createdItem.shopping_mall_wishlist_id,
      productVariantId: createdItem.shopping_mall_product_variant_id,
      note: createdItem.note,
      createdAt: toISOStringSafe(createdItem.created_at),
      updatedAt: toISOStringSafe(createdItem.updated_at),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        throw new HttpException(
          "Product variant already exists in this wishlist",
          409,
        );
      }
    }
    throw error;
  }
}
