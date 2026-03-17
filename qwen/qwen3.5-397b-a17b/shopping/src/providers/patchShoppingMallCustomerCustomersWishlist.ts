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

export async function patchShoppingMallCustomerCustomersWishlist(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const sort = props.body.sort ?? "newest";
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    product: {
      deleted: false,
    },
  } satisfies Prisma.shopping_mall_wishlistsWhereInput;
  const orderByInput = (
    sort === "priceAsc"
      ? { product: { base_price: "asc" as const } }
      : sort === "priceDesc"
        ? { product: { base_price: "desc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_wishlistsOrderByWithRelationInput;
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
              approved_by_admin_id: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_category_id: true,
              created_at: true,
            },
          },
          images: {
            where: { deleted_at: null },
            orderBy: { display_order: "asc" as const },
            take: 1,
            select: {
              id: true,
              image_url: true,
              display_order: true,
              created_at: true,
            },
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
      const mainImage = wishlist.product.images[0];
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
            approvedByAdmin: null,
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: wishlist.product.category.id as string & tags.Format<"uuid">,
            name: wishlist.product.category.name,
            description: wishlist.product.category.description ?? undefined,
            parent: undefined,
            created_at:
              wishlist.product.category.created_at.toISOString() as string &
                tags.Format<"date-time">,
          } satisfies IShoppingMallCategory.ISummary,
          mainImage: mainImage
            ? ({
                id: mainImage.id as string & tags.Format<"uuid">,
                imageUrl: mainImage.image_url as string & tags.Format<"uri">,
                displayOrder: mainImage.display_order,
                createdAt: mainImage.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              } satisfies IShoppingMallProductImage.ISummary)
            : null,
          variantCount: 0,
          averageRating: null,
          reviewCount: 0,
          createdAt: wishlist.product.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IShoppingMallProduct.ISummary,
      } satisfies IShoppingMallWishlist.ISummary;
    }),
  };
}
