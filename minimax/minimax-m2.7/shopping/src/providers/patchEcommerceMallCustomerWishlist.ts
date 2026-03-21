import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
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

export async function patchEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.IRequest;
}): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const wishlist = await MyGlobal.prisma.ecommerce_mall_wishlists.findFirst({
    where: { shopping_customer_id: props.customer.id },
    select: { id: true },
  });
  if (!wishlist) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const whereClause: Prisma.ecommerce_mall_wishlist_itemsWhereInput = {
    ecommerce_mall_wishlist_id: wishlist.id,
    ...(props.body.search
      ? {
          product: {
            name: { contains: props.body.search, mode: "insensitive" as const },
            deleted_at: null,
          },
        }
      : {
          product: { deleted_at: null },
        }),
  };
  const orderBy: Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput =
    props.body.sort_by === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const wishlistItems =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
      where: whereClause,
      orderBy: orderBy,
      skip: skip,
      take: limit,
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
              select: { id: true },
            },
            variants: {
              select: { price: true },
              where: { deleted_at: null },
            },
            reviews: {
              select: { rating: true },
              where: { deleted_at: null },
            },
            productImages: {
              select: { image_url: true },
              where: { display_order: 0 },
              take: 1,
            },
          },
        },
      },
    });
  const sellerIds = wishlistItems
    .map((item) => item.product.seller?.id)
    .filter((id): id is string => id !== null);
  const sellerProfiles =
    sellerIds.length > 0
      ? await MyGlobal.prisma.ecommerce_mall_seller_profiles.findMany({
          where: { seller_id: { in: sellerIds } },
          select: { seller_id: true, name: true },
        })
      : [];
  const sellerNameMap = new Map(
    sellerProfiles.map((s) => [s.seller_id, s.name]),
  );
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereClause,
  });
  const transformedData = wishlistItems.map((item) => {
    const prices = item.product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const minPrice =
      prices.length > 0 ? Math.min(...prices) : item.product.base_price;
    const maxPrice =
      prices.length > 0 ? Math.max(...prices) : item.product.base_price;
    const ratings = item.product.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;
    const primaryImageUrl = item.product.productImages[0]?.image_url ?? "";
    const sellerId = item.product.seller?.id;
    const sellerName = sellerId ? (sellerNameMap.get(sellerId) ?? "") : "";
    return {
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
      product: {
        id: item.product.id,
        name: item.product.name,
        min_price: minPrice,
        max_price: maxPrice,
        primary_image_url: primaryImageUrl,
        seller_name: sellerName,
        average_rating: Math.round(averageRating * 10) / 10,
        reviews_count: ratings.length,
        created_at: toISOStringSafe(item.product.created_at),
      } satisfies IEcommerceMallProduct.ISummary,
    } satisfies IEcommerceMallWishlistItem.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
