import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdReviewsQuery(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  // Since ratingMin, ratingMax and other filtering properties do not exist on IRequest, skip validation and filtering by them
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Use default pagination values because page and limit are undefined in IRequest
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Simple where clause only filtering by product ID and active reviews (deleted_at: null)
  const where: Prisma.shopping_mall_product_reviewsWhereInput = {
    deleted_at: null,
    productVariant: {
      shopping_mall_product_id: props.productId,
    },
  };
  // Order by created_at descending by default
  const orderBy: Prisma.shopping_mall_product_reviewsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const total = await MyGlobal.prisma.shopping_mall_product_reviews.count({
    where,
  });
  const reviews = await MyGlobal.prisma.shopping_mall_product_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      customer: {
        select: {
          display_name: true,
        },
      },
      orderItem: {
        select: {
          id: true,
        },
      },
      productVariant: {
        select: {
          sku_code: true,
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body ?? undefined,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      customerDisplayName: review.customer.display_name ?? undefined,
      orderItemId: review.orderItem.id,
      productVariantSkuCode: review.productVariant.sku_code,
    })),
  };
}
