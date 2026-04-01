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

export async function postShoppingMallCustomerWishlistProductId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Check for duplicate wishlist entry (by customer only, since no product_id exists)
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Create wishlist item (only stores customer_id, no product reference possible)
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
    } satisfies Prisma.shopping_mall_wishlist_itemsCreateArgs);
  // Construct customer summary
  const customer: IShoppingMallCustomer.ISummary = {
    id: wishlistItem.customer.id,
    email: wishlistItem.customer.email,
    display_name: wishlistItem.customer.display_name,
    phone_number: wishlistItem.customer.phone_number ?? null,
    status: wishlistItem.customer.status,
    created_at: toISOStringSafe(wishlistItem.customer.created_at),
    updated_at: toISOStringSafe(wishlistItem.customer.updated_at),
    deleted_at: wishlistItem.customer.deleted_at
      ? toISOStringSafe(wishlistItem.customer.deleted_at)
      : null,
  };
  // Placeholder product summary (database has no products table)
  const product: IShoppingMallProduct.ISummary = {
    id: props.productId,
    name: "",
    description: "",
    basePrice: 0,
    category: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "",
      description: null,
      parent: null,
      created_at: new Date().toISOString(),
    } satisfies IShoppingMallCategory.ISummary,
    seller: {
      id: "00000000-0000-0000-0000-000000000000",
      email: "",
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
  };
  // Placeholder seller summary
  const seller: IShoppingMallSeller.ISummary = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "",
    shop_name: "",
    shop_description: null,
    logo_image: null,
    approval_status: "pending",
    rejection_reason: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    id: wishlistItem.id,
    customer,
    product,
    seller,
    averageRating: 0,
    reviewCount: 0,
    isInStock: false,
    createdAt: toISOStringSafe(wishlistItem.created_at),
    updatedAt: toISOStringSafe(wishlistItem.updated_at),
  };
}
