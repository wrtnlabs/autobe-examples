import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewRating";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdRating(props: {
  productId: string;
}): Promise<IShoppingMallProductReviewRating> {
  const rating =
    await MyGlobal.prisma.shopping_mall_product_review_ratings.findFirst({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!rating) {
    throw new HttpException("Product rating not found", 404);
  }
  return {
    id: rating.id,
    product_id: rating.product_id,
    average_rating: rating.average_rating,
    review_count: rating.review_count,
    created_at: toISOStringSafe(rating.created_at),
    updated_at: toISOStringSafe(rating.updated_at),
  };
}
