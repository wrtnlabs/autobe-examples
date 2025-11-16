import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallWishlistItemOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemOptions";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  const existing =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!existing) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (existing.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException(
      "Wishlist item does not belong to the specified wishlist",
      404,
    );
  }

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { shopping_mall_customer_id: true },
  });

  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const customer_relation =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: props.customer.id },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!customer_relation) {
    throw new HttpException("Customer not found", 404);
  }

  const product_relation =
    await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: existing.shopping_mall_product_id },
      select: {
        id: true,
        code: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!product_relation) {
    throw new HttpException("Product not found", 404);
  }

  return {
    id: updated.id,
    wishlist_id: updated.shopping_mall_wishlist_id,
    product_id: updated.shopping_mall_product_id,
    quantity: 1,
    options: undefined,
    created_at: toISOStringSafe(existing.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    customer: {
      id: customer_relation.id,
      email: customer_relation.email,
      name: customer_relation.name,
      created_at: toISOStringSafe(customer_relation.created_at),
      updated_at: customer_relation.updated_at
        ? toISOStringSafe(customer_relation.updated_at)
        : undefined,
    },
    product: {
      id: product_relation.id,
      code: product_relation.code,
      name: product_relation.name,
      is_active: product_relation.is_active,
      created_at: toISOStringSafe(product_relation.created_at),
      updated_at: toISOStringSafe(product_relation.updated_at),
      deleted_at: product_relation.deleted_at
        ? toISOStringSafe(product_relation.deleted_at)
        : null,
    },
  };
}
