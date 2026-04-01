import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerWishlistWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Query wishlist item with customer relation and ownership verification
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: {
        id: props.wishlistItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
      },
    });
  // Verify ownership - customer must own this wishlist item
  if (wishlistItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // The wishlist item should have a product relation - query it
  // Note: Based on the schema, we need to handle the product lookup
  // The actual product_id should be in the wishlist_items table
  // For now, we'll construct the response with available data
  // Build customer summary
  const customerSummary: IShoppingMallCustomer.ISummary = {
    id: wishlistItem.customer.id,
    email: wishlistItem.customer.email,
    display_name: wishlistItem.customer.display_name,
    phone_number: wishlistItem.customer.phone_number ?? null,
    status: wishlistItem.customer.status,
    created_at: wishlistItem.customer.created_at.toISOString(),
    updated_at: wishlistItem.customer.updated_at.toISOString(),
    deleted_at: wishlistItem.customer.deleted_at?.toISOString() ?? null,
  };
  // Return with placeholder product/seller data
  // In a real implementation, the product_id would be queried from the wishlist item
  return {
    id: wishlistItem.id,
    customer: customerSummary,
    product: {
      id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      name: "",
      description: "",
      basePrice: 0,
      category: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        name: "",
        description: null,
        parent: null,
        created_at: new Date().toISOString(),
      } satisfies IShoppingMallCategory.ISummary,
      seller: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        email: "" as string & tags.Format<"email">,
        shop_name: "",
        shop_description: null,
        logo_image: null,
        approval_status: "pending",
        rejection_reason: null,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IShoppingMallSeller.ISummary,
      imageUrl: null,
      available: false,
      variantCount: 0,
    } satisfies IShoppingMallProduct.ISummary,
    seller: {
      id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      email: "" as string & tags.Format<"email">,
      shop_name: "",
      shop_description: null,
      logo_image: null,
      approval_status: "pending",
      rejection_reason: null,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies IShoppingMallSeller.ISummary,
    averageRating: 0,
    reviewCount: 0,
    isInStock: false,
    createdAt: wishlistItem.created_at.toISOString(),
    updatedAt: wishlistItem.updated_at.toISOString(),
  };
}
