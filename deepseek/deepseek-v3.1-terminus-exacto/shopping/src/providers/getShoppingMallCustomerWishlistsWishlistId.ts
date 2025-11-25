import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  // Find the wishlist with basic validation
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Get wishlist items with product details
  const wishlistItems =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: {
        shopping_mall_wishlist_id: props.wishlistId,
        deleted_at: null,
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                display_order: true,
                active: true,
                parent_id: true,
                created_at: true,
                updated_at: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    display_order: true,
                    active: true,
                    parent_id: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                business_name: true,
                contact_person: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        added_at: "desc",
      },
    });

  // Map wishlist items with proper type conversion
  const mappedItems = wishlistItems.map((item) => ({
    id: item.id,
    product: {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      status: item.product.status,
      stock_quantity: item.product.stock_quantity,
      category: {
        id: item.product.category.id,
        name: item.product.category.name,
        description: item.product.category.description ?? undefined,
        display_order: item.product.category.display_order,
        active: item.product.category.active,
        parent_id:
          item.product.category.parent_id !== null
            ? typia.assert<string & tags.Format<"uuid">>(
                item.product.category.parent_id,
              )
            : typia.assert<string & tags.Format<"uuid">>(
                item.product.category.id,
              ), // Use category ID as fallback for top-level categories
        created_at: toISOStringSafe(item.product.category.created_at),
        updated_at: toISOStringSafe(item.product.category.updated_at),
        parent: item.product.category.parent
          ? {
              id: item.product.category.parent.id,
              name: item.product.category.parent.name,
              description:
                item.product.category.parent.description ?? undefined,
              display_order: item.product.category.parent.display_order,
              active: item.product.category.parent.active,
              parent_id:
                item.product.category.parent.parent_id !== null
                  ? typia.assert<string & tags.Format<"uuid">>(
                      item.product.category.parent.parent_id,
                    )
                  : typia.assert<string & tags.Format<"uuid">>(
                      item.product.category.parent.id,
                    ),
              created_at: toISOStringSafe(
                item.product.category.parent.created_at,
              ),
              updated_at: toISOStringSafe(
                item.product.category.parent.updated_at,
              ),
            }
          : undefined,
      },
      seller: {
        id: item.product.seller.id,
        business_name: item.product.seller.business_name,
        contact_person: item.product.seller.contact_person,
        email: item.product.seller.email,
        status: item.product.seller.status,
      },
    },
    product_variant_id: (item as any).product_variant_id ?? undefined,
    quantity: item.quantity ?? undefined,
    added_at: toISOStringSafe(item.added_at),
    notes: item.notes ?? undefined,
  }));

  return {
    id: wishlist.id,
    name: wishlist.name,
    description: wishlist.description ?? undefined,
    is_public: wishlist.is_public,
    priority: wishlist.priority,
    status: typia.assert<"active" | "archived" | "shared">(wishlist.status),
    customer: {
      id: wishlist.customer.id,
      email: wishlist.customer.email,
      first_name: wishlist.customer.first_name,
      last_name: wishlist.customer.last_name,
      phone_number: wishlist.customer.phone_number ?? undefined,
      status: wishlist.customer.status,
      created_at: toISOStringSafe(wishlist.customer.created_at),
      updated_at: wishlist.customer.updated_at
        ? toISOStringSafe(wishlist.customer.updated_at)
        : undefined,
    },
    items: mappedItems.length > 0 ? mappedItems : undefined,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    deleted_at: wishlist.deleted_at
      ? toISOStringSafe(wishlist.deleted_at)
      : undefined,
  };
}
