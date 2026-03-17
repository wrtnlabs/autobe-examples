import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "newest";
  const orderByInput = (
    sort === "priceAsc"
      ? { product: { base_price: "asc" as const } }
      : sort === "priceDesc"
        ? { product: { base_price: "desc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_wishlistsOrderByWithRelationInput;
  const whereInput = {
    customer_id: props.customer.id,
    product: {
      deleted: false,
    },
  } satisfies Prisma.shopping_mall_wishlistsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_wishlists.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      created_at: true,
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          created_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              approval_status: true,
              suspended: true,
              created_at: true,
              approvedByAdmin: {
                select: {
                  id: true,
                  email: true,
                  grade: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              parent_category_id: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                },
              },
            },
          },
          images: {
            where: { deleted_at: null },
            orderBy: { display_order: "asc" },
            take: 1,
            select: {
              id: true,
              image_url: true,
              display_order: true,
              created_at: true,
            },
          },
          variants: {
            where: { deleted: false },
          },
          reviews: {
            where: { deleted_at: null },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlists.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((wishlist) => {
      const totalRating = wishlist.product.reviews.reduce(
        (sum, r) => sum + 0,
        0,
      );
      const avgRating =
        wishlist.product.reviews.length > 0
          ? totalRating / wishlist.product.reviews.length
          : null;
      return {
        id: wishlist.id as string & tags.Format<"uuid">,
        created_at: wishlist.created_at.toISOString() as string &
          tags.Format<"date-time">,
        product: {
          id: wishlist.product.id as string & tags.Format<"uuid">,
          name: wishlist.product.name,
          basePrice: wishlist.product.base_price,
          seller: {
            id: wishlist.product.seller.id as string & tags.Format<"uuid">,
            email: wishlist.product.seller.email as string &
              tags.Format<"email">,
            shop_name: wishlist.product.seller.shop_name,
            shop_description: wishlist.product.seller.shop_description,
            logo_image_url: wishlist.product.seller.logo_image_url as
              | (string & tags.Format<"uri">)
              | null,
            approval_status: wishlist.product.seller.approval_status as
              | "PENDING"
              | "APPROVED"
              | "REJECTED",
            suspended: wishlist.product.seller.suspended,
            created_at:
              wishlist.product.seller.created_at.toISOString() as string &
                tags.Format<"date-time">,
            approvedByAdmin:
              wishlist.product.seller.approvedByAdmin === null
                ? null
                : {
                    id: wishlist.product.seller.approvedByAdmin.id as string &
                      tags.Format<"uuid">,
                    email: wishlist.product.seller.approvedByAdmin
                      .email as string & tags.Format<"email">,
                    grade: wishlist.product.seller.approvedByAdmin.grade,
                    created_at:
                      wishlist.product.seller.approvedByAdmin.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                    updated_at:
                      wishlist.product.seller.approvedByAdmin.updated_at.toISOString() as string &
                        tags.Format<"date-time">,
                    deleted_at:
                      wishlist.product.seller.approvedByAdmin.deleted_at ===
                      null
                        ? null
                        : (wishlist.product.seller.approvedByAdmin.deleted_at.toISOString() as string &
                            tags.Format<"date-time">),
                  },
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: wishlist.product.category.id as string & tags.Format<"uuid">,
            name: wishlist.product.category.name,
            description: wishlist.product.category.description ?? undefined,
            created_at:
              wishlist.product.category.created_at.toISOString() as string &
                tags.Format<"date-time">,
            parent:
              wishlist.product.category.parent === null
                ? undefined
                : {
                    id: wishlist.product.category.parent.id as string &
                      tags.Format<"uuid">,
                    name: wishlist.product.category.parent.name,
                    description:
                      wishlist.product.category.parent.description ?? undefined,
                    created_at:
                      wishlist.product.category.parent.created_at.toISOString() as string &
                        tags.Format<"date-time">,
                  },
          } satisfies IShoppingMallCategory.ISummary,
          mainImage:
            wishlist.product.images.length === 0
              ? null
              : ({
                  id: wishlist.product.images[0].id as string &
                    tags.Format<"uuid">,
                  imageUrl: wishlist.product.images[0].image_url as string &
                    tags.Format<"uri">,
                  displayOrder: wishlist.product.images[0].display_order,
                  createdAt:
                    wishlist.product.images[0].created_at.toISOString() as string &
                      tags.Format<"date-time">,
                } satisfies IShoppingMallProductImage.ISummary),
          variantCount: wishlist.product.variants.length,
          averageRating: avgRating,
          reviewCount: wishlist.product.reviews.length,
          createdAt: wishlist.product.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IShoppingMallProduct.ISummary,
      };
    }),
  } satisfies IPageIShoppingMallWishlist.ISummary;
}
