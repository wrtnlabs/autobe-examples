import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
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

export async function patchMallPlatformCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IMallPlatformWishlistItem.IRequest;
}): Promise<IPageIMallPlatformWishlistItem.ISummary> {
  const wishlist =
    await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        customer_id: true,
      },
    });
  if (wishlist.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const where = {
    mall_platform_wishlist_id: props.wishlistId,
    deleted_at: null,
    product: {
      deleted_at: null,
    },
  } satisfies Prisma.mall_platform_wishlist_itemsWhereInput;
  const rows = await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      wishlist: {
        select: {
          id: true,
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
      },
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
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              parentCategory: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.mall_platform_wishlist_items.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      async (row) =>
        ({
          id: row.id,
          wishlist: {
            id: row.wishlist.id,
            customer: {
              id: row.wishlist.customer.id,
              email: row.wishlist.customer.email,
              status: row.wishlist.customer.status,
              created_at: row.wishlist.customer.created_at.toISOString(),
              updated_at: row.wishlist.customer.updated_at.toISOString(),
              deleted_at:
                row.wishlist.customer.deleted_at?.toISOString() ?? null,
            } satisfies IMallPlatformCustomer.ISummary,
            createdAt: row.wishlist.created_at.toISOString(),
            updatedAt: row.wishlist.updated_at.toISOString(),
            deletedAt: row.wishlist.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformWishlist.ISummary,
          product: {
            id: row.product.id,
            name: row.product.name,
            description: row.product.description,
            basePrice: row.product.base_price,
            sellerAccount: {
              id: row.product.sellerAccount.id,
              email: row.product.sellerAccount.email,
              approvalStatus: row.product.sellerAccount.approval_status,
              rejectionReason: row.product.sellerAccount.rejection_reason,
              suspendedAt:
                row.product.sellerAccount.suspended_at?.toISOString() ?? null,
              deletedAt:
                row.product.sellerAccount.deleted_at?.toISOString() ?? null,
              createdAt: row.product.sellerAccount.created_at.toISOString(),
              updatedAt: row.product.sellerAccount.updated_at.toISOString(),
            } satisfies IMallPlatformSellerAccount.ISummary,
            category:
              row.product.category === null
                ? null
                : ({
                    id: row.product.category.id,
                    parentCategory:
                      row.product.category.parentCategory === null
                        ? null
                        : ({
                            id: row.product.category.parentCategory.id,
                            parentCategory: null,
                            name: row.product.category.parentCategory.name,
                            description:
                              row.product.category.parentCategory.description,
                            createdAt:
                              row.product.category.parentCategory.created_at.toISOString(),
                            updatedAt:
                              row.product.category.parentCategory.updated_at.toISOString(),
                            deletedAt:
                              row.product.category.parentCategory.deleted_at?.toISOString() ??
                              null,
                          } satisfies IMallPlatformCategory.ISummary),
                    name: row.product.category.name,
                    description: row.product.category.description,
                    createdAt: row.product.category.created_at.toISOString(),
                    updatedAt: row.product.category.updated_at.toISOString(),
                    deletedAt:
                      row.product.category.deleted_at?.toISOString() ?? null,
                  } satisfies IMallPlatformCategory.ISummary),
            createdAt: row.product.created_at.toISOString(),
            updatedAt: row.product.updated_at.toISOString(),
            deletedAt: row.product.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformProduct.ISummary,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          deletedAt: row.deleted_at?.toISOString() ?? null,
        }) satisfies IMallPlatformWishlistItem.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
