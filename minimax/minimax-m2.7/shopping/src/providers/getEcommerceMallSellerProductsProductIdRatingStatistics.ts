import { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerProductsProductIdRatingStatistics(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductRatingStatistic> {
  // Verify product exists and belongs to the authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Ownership check: ensure seller owns this product
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all non-deleted reviews for this product
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      rating: true,
    },
  });
  const totalReviews = reviews.length;
  // Calculate average rating
  let averageRating = 0;
  if (totalReviews > 0) {
    const sumOfRatings = reviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    averageRating = Math.round((sumOfRatings / totalReviews) * 10) / 10;
  }
  // Calculate rating distribution
  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const review of reviews) {
    const key = String(review.rating) as keyof typeof distribution;
    if (distribution[key] !== undefined) {
      distribution[key]++;
    }
  }
  return {
    averageRating,
    totalReviews: totalReviews as number & tags.Type<"int32">,
    distribution: {
      "1": distribution["1"] as number & tags.Type<"int32">,
      "2": distribution["2"] as number & tags.Type<"int32">,
      "3": distribution["3"] as number & tags.Type<"int32">,
      "4": distribution["4"] as number & tags.Type<"int32">,
      "5": distribution["5"] as number & tags.Type<"int32">,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductsProductIdRatingStatistics(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductRatingStatistic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------