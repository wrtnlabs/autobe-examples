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

export async function putMallPlatformCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IMallPlatformWishlist.IUpdate;
}): Promise<IMallPlatformWishlist> {
  const wishlist =
    await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: {
        id: props.wishlistId,
      },
      select: {
        id: true,
        customer_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
      },
    });
  if (wishlist.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const desiredProductIds = Array.from(
    new Set(props.body.wishlistItems.map((item) => item.mallPlatformProductId)),
  );
  const activeProducts = await MyGlobal.prisma.mall_platform_products.findMany({
    where: {
      id: { in: desiredProductIds },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
        },
      },
    },
  });
  const activeProductIdSet = new Set(
    activeProducts.map((product) => product.id),
  );
  const finalProductIds = desiredProductIds.filter((productId) =>
    activeProductIdSet.has(productId),
  );
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const existingItems = await prisma.mall_platform_wishlist_items.findMany({
      where: {
        mall_platform_wishlist_id: props.wishlistId,
      },
      select: {
        id: true,
        mall_platform_product_id: true,
        deleted_at: true,
      },
    });
    const existingActiveItems = existingItems.filter(
      (item) => item.deleted_at === null,
    );
    const existingProductIdSet = new Set(
      existingActiveItems.map((item) => item.mall_platform_product_id),
    );
    const finalProductIdSet = new Set(finalProductIds);
    const removedItemIds = existingActiveItems
      .filter((item) => !finalProductIdSet.has(item.mall_platform_product_id))
      .map((item) => item.id);
    if (removedItemIds.length > 0) {
      await prisma.mall_platform_wishlist_items.deleteMany({
        where: {
          id: { in: removedItemIds },
        },
      });
    }
    const insertedProductIds = finalProductIds.filter(
      (productId) => !existingProductIdSet.has(productId),
    );
    if (insertedProductIds.length > 0) {
      for (const productId of insertedProductIds) {
        await prisma.mall_platform_wishlist_items.create({
          data: {
            id: v4(),
            mall_platform_wishlist_id: props.wishlistId,
            mall_platform_product_id: productId,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
    await prisma.mall_platform_wishlists.update({
      where: {
        id: props.wishlistId,
      },
      data: {
        updated_at: new Date(),
      },
    });
  });
  const refreshedWishlist =
    await MyGlobal.prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: {
        id: props.wishlistId,
      },
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
    });
  const savedItems =
    await MyGlobal.prisma.mall_platform_wishlist_items.findMany({
      where: {
        mall_platform_wishlist_id: props.wishlistId,
        deleted_at: null,
        product: {
          deleted_at: null,
        },
      },
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
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    id: refreshedWishlist.id,
    customer: {
      id: refreshedWishlist.customer.id,
      email: refreshedWishlist.customer.email,
      status: refreshedWishlist.customer.status,
      created_at: toISOStringSafe(refreshedWishlist.customer.created_at),
      updated_at: toISOStringSafe(refreshedWishlist.customer.updated_at),
      deleted_at: refreshedWishlist.customer.deleted_at
        ? toISOStringSafe(refreshedWishlist.customer.deleted_at)
        : null,
    },
    wishlistItems: savedItems.map((item) => ({
      id: item.id,
      wishlist: {
        id: item.wishlist.id,
        customer: {
          id: item.wishlist.customer.id,
          email: item.wishlist.customer.email,
          status: item.wishlist.customer.status,
          created_at: toISOStringSafe(item.wishlist.customer.created_at),
          updated_at: toISOStringSafe(item.wishlist.customer.updated_at),
          deleted_at: item.wishlist.customer.deleted_at
            ? toISOStringSafe(item.wishlist.customer.deleted_at)
            : null,
        },
        createdAt: toISOStringSafe(item.wishlist.created_at),
        updatedAt: toISOStringSafe(item.wishlist.updated_at),
        deletedAt: item.wishlist.deleted_at
          ? toISOStringSafe(item.wishlist.deleted_at)
          : null,
      },
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
        },
        category:
          item.product.category === null
            ? null
            : {
                id: item.product.category.id,
                parentCategory:
                  item.product.category.parentCategory === null
                    ? null
                    : {
                        id: item.product.category.parentCategory.id,
                        parentCategory:
                          item.product.category.parentCategory
                            .parentCategory === null
                            ? null
                            : {
                                id: item.product.category.parentCategory
                                  .parentCategory.id,
                                parentCategory: null,
                                name: item.product.category.parentCategory
                                  .parentCategory.name,
                                description:
                                  item.product.category.parentCategory
                                    .parentCategory.description,
                                createdAt: toISOStringSafe(
                                  item.product.category.parentCategory
                                    .parentCategory.created_at,
                                ),
                                updatedAt: toISOStringSafe(
                                  item.product.category.parentCategory
                                    .parentCategory.updated_at,
                                ),
                                deletedAt: item.product.category.parentCategory
                                  .parentCategory.deleted_at
                                  ? toISOStringSafe(
                                      item.product.category.parentCategory
                                        .parentCategory.deleted_at,
                                    )
                                  : null,
                              },
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
                      },
                name: item.product.category.name,
                description: item.product.category.description,
                createdAt: toISOStringSafe(item.product.category.created_at),
                updatedAt: toISOStringSafe(item.product.category.updated_at),
                deletedAt: item.product.category.deleted_at
                  ? toISOStringSafe(item.product.category.deleted_at)
                  : null,
              },
        createdAt: toISOStringSafe(item.product.created_at),
        updatedAt: toISOStringSafe(item.product.updated_at),
        deletedAt: item.product.deleted_at
          ? toISOStringSafe(item.product.deleted_at)
          : null,
      },
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    created_at: toISOStringSafe(refreshedWishlist.created_at),
    updated_at: toISOStringSafe(refreshedWishlist.updated_at),
    deleted_at: refreshedWishlist.deleted_at
      ? toISOStringSafe(refreshedWishlist.deleted_at)
      : null,
  };
}
