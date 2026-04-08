import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerProductsProductIdReviewStats(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Verify product exists (throws 404 if not found)
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get aggregate statistics for non-deleted reviews
  const aggregateResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });
  // Get distribution by rating (1-5)
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });
  // Build distribution object with default 0 for each rating
  const distribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  // Fill in actual counts from query result
  for (const item of distributionResult) {
    const ratingKey = String(item.rating) as "1" | "2" | "3" | "4" | "5";
    distribution[ratingKey] = item._count.rating;
  }
  // Calculate average rating rounded to 1 decimal place
  const averageRating = aggregateResult._avg.rating ?? 0;
  const roundedAverageRating = Math.round(averageRating * 10) / 10;
  return {
    averageRating: roundedAverageRating,
    totalCount: aggregateResult._count.rating,
    distribution,
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
// import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerProductsProductIdReviewStats(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductReviewStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------