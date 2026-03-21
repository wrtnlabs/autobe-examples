import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Base where conditions - only seller's products and not deleted
  const baseWhere = {
    deleted_at: null,
    ecommerce_mall_seller_id: props.seller.id,
  };
  // Build search filter
  const searchWhere = props.body.search
    ? { name: { contains: props.body.search, mode: "insensitive" as const } }
    : {};
  // Build category filter
  const categoryWhere = props.body.categoryId
    ? { ecommerce_mall_category_id: props.body.categoryId }
    : {};
  // Build price range filter using variants
  let priceWhere = {};
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    const variantWhere: Record<string, unknown> = { deleted_at: null };
    if (props.body.minPrice !== undefined) {
      variantWhere.price = { gte: props.body.minPrice };
    }
    if (props.body.maxPrice !== undefined) {
      variantWhere.price = {
        ...(variantWhere.price as object),
        lte: props.body.maxPrice,
      };
    }
    priceWhere = { variants: { some: variantWhere } };
  }
  // Build in-stock filter
  const inStockWhere = props.body.inStock
    ? { variants: { some: { deleted_at: null, quantity: { gt: 0 } } } }
    : {};
  // Combine all where conditions
  const where = {
    ...baseWhere,
    ...searchWhere,
    ...categoryWhere,
    ...priceWhere,
    ...inStockWhere,
  };
  // Build order by
  let orderBy: Record<string, string>;
  switch (props.body.sort) {
    case "price_asc":
      orderBy = { base_price: "asc" };
      break;
    case "price_desc":
      orderBy = { base_price: "desc" };
      break;
    case "newest":
    default:
      orderBy = { created_at: "desc" };
  }
  // Query products with aggregations
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      seller: {
        select: {
          profile: {
            select: {
              name: true,
            },
          },
        },
      },
      productImages: {
        where: { display_order: 0 },
        select: { image_url: true },
        take: 1,
      },
      variants: {
        where: { deleted_at: null },
        select: { price: true },
      },
      reviews: {
        where: { deleted_at: null },
        select: { rating: true },
      },
    },
  });
  // Calculate total count
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({ where });
  // Transform results
  const transformedData = products.map((product) => {
    const prices = product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const minPrice =
      prices.length > 0 ? Math.min(...prices) : product.base_price;
    const maxPrice =
      prices.length > 0 ? Math.max(...prices) : product.base_price;
    const primaryImage = product.productImages[0];
    const ratings = product.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
    return {
      id: product.id as string & tags.Format<"uuid">,
      name: product.name,
      min_price: minPrice,
      max_price: maxPrice,
      primary_image_url: primaryImage?.image_url ?? "",
      seller_name: product.seller.profile?.name ?? "",
      average_rating: Math.round(averageRating * 10) / 10,
      reviews_count: ratings.length as number & tags.Type<"int32">,
      created_at: product.created_at.toISOString() as string &
        tags.Format<"date-time">,
    };
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: transformedData,
  };
}
