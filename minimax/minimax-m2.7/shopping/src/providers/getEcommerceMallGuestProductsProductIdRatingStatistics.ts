import { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallGuestProductsProductIdRatingStatistics(props: {
  guest: GuestPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductRatingStatistic> {
  // Verify product exists (404 if not found)
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Query reviews using groupBy for efficient aggregation by rating
  const reviewStats = await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
    by: ["rating"],
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
    _count: { rating: true },
  });
  // Calculate totals and distribution
  let totalReviews = 0;
  let ratingSum = 0;
  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const stat of reviewStats) {
    const count = stat._count.rating;
    totalReviews += count;
    ratingSum += stat.rating * count;
    distribution[String(stat.rating)] = count;
  }
  // Calculate average rating rounded to 1 decimal place
  const averageRating =
    totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;
  // Build and validate response
  const result: IEcommerceMallProductRatingStatistic = {
    averageRating,
    totalReviews:
      totalReviews as IEcommerceMallProductRatingStatistic["totalReviews"],
    distribution: {
      "1": distribution[
        "1"
      ] as IEcommerceMallProductRatingStatistic["distribution"]["1"],
      "2": distribution[
        "2"
      ] as IEcommerceMallProductRatingStatistic["distribution"]["2"],
      "3": distribution[
        "3"
      ] as IEcommerceMallProductRatingStatistic["distribution"]["3"],
      "4": distribution[
        "4"
      ] as IEcommerceMallProductRatingStatistic["distribution"]["4"],
      "5": distribution[
        "5"
      ] as IEcommerceMallProductRatingStatistic["distribution"]["5"],
    },
  };
  return typia.assert<IEcommerceMallProductRatingStatistic>(result);
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
// export async function getEcommerceMallGuestProductsProductIdRatingStatistics(props: {
//   guest: GuestPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductRatingStatistic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------