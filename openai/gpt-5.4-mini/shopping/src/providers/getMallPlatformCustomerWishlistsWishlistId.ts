import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
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

export async function getMallPlatformCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformWishlist> {
  const wishlist =
    await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: {
        id: props.wishlistId,
      },
      select: {
        id: true,
        customer_id: true,
        customer: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (wishlist.customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  const items = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
    where: {
      mall_platform_wishlist_id: props.wishlistId,
      deleted_at: null,
      product: {
        deleted_at: null,
      },
    },
    select: {
      id: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          base_price: true,
          sellerAccount: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              rejection_reason: true,
              suspended_at: true,
              deleted_at: true,
              created_at: true,
              updated_at: true,
            },
          },
          category: {
            select: {
              id: true,
              parentCategory: {
                select: {
                  id: true,
                  parentCategory: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  const customer = {
    id: wishlist.customer.id,
    email: wishlist.customer.email,
    status: wishlist.customer.status,
    created_at: toISOStringSafe(wishlist.customer.created_at),
    updated_at: toISOStringSafe(wishlist.customer.updated_at),
    deleted_at: wishlist.customer.deleted_at
      ? toISOStringSafe(wishlist.customer.deleted_at)
      : null,
  } satisfies IMallPlatformCustomer.ISummary;
  const wishlistSummary = {
    id: wishlist.id,
    customer,
    createdAt: toISOStringSafe(wishlist.created_at),
    updatedAt: toISOStringSafe(wishlist.updated_at),
    deletedAt: wishlist.deleted_at
      ? toISOStringSafe(wishlist.deleted_at)
      : null,
  } satisfies IMallPlatformWishlist.ISummary;
  return {
    id: wishlist.id,
    customer,
    wishlistItems: items.map((item) => ({
      id: item.id,
      wishlist: wishlistSummary,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        basePrice: item.product.base_price,
        sellerAccount: {
          id: item.product.sellerAccount.id,
          email: item.product.sellerAccount.email,
          approvalStatus: item.product.sellerAccount.approval_status,
          rejectionReason: item.product.sellerAccount.rejection_reason,
          suspendedAt: item.product.sellerAccount.suspended_at
            ? toISOStringSafe(item.product.sellerAccount.suspended_at)
            : null,
          deletedAt: item.product.sellerAccount.deleted_at
            ? toISOStringSafe(item.product.sellerAccount.deleted_at)
            : null,
          createdAt: toISOStringSafe(item.product.sellerAccount.created_at),
          updatedAt: toISOStringSafe(item.product.sellerAccount.updated_at),
        } satisfies IMallPlatformSellerAccount.ISummary,
        category:
          item.product.category === null
            ? null
            : ({
                id: item.product.category.id,
                parentCategory:
                  item.product.category.parentCategory === null
                    ? null
                    : ({
                        id: item.product.category.parentCategory.id,
                        parentCategory: null,
                        name: item.product.category.parentCategory.name,
                        description:
                          item.product.category.parentCategory.description,
                        createdAt: toISOStringSafe(
                          item.product.category.parentCategory.created_at,
                        ),
                        updatedAt: toISOStringSafe(
                          item.product.category.parentCategory.updated_at,
                        ),
                        deletedAt: item.product.category.parentCategory
                          .deleted_at
                          ? toISOStringSafe(
                              item.product.category.parentCategory.deleted_at,
                            )
                          : null,
                      } satisfies IMallPlatformCategory.ISummary),
                name: item.product.category.name,
                description: item.product.category.description,
                createdAt: toISOStringSafe(item.product.category.created_at),
                updatedAt: toISOStringSafe(item.product.category.updated_at),
                deletedAt: item.product.category.deleted_at
                  ? toISOStringSafe(item.product.category.deleted_at)
                  : null,
              } satisfies IMallPlatformCategory.ISummary),
        createdAt: toISOStringSafe(item.product.created_at),
        updatedAt: toISOStringSafe(item.product.updated_at),
        deletedAt: item.product.deleted_at
          ? toISOStringSafe(item.product.deleted_at)
          : null,
      } satisfies IMallPlatformProduct.ISummary,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })) satisfies IMallPlatformWishlistItem[],
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    deleted_at: wishlist.deleted_at
      ? toISOStringSafe(wishlist.deleted_at)
      : null,
  };
}
