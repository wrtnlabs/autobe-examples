import { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdRatingStatistics(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductRatingStatistic> {
  // Verify product exists - throws 404 if not found
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Query reviews for aggregated statistics
  const [totalResult, distributionResult] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    }),
  ]);
  const totalReviews = totalResult._count._all;
  const averageRating = totalResult._avg.rating ?? 0;
  const roundedAverage = Math.round(averageRating * 10) / 10;
  // Initialize distribution with all rating levels set to 0
  const distributionMap: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  // Populate distribution from groupBy results
  for (const group of distributionResult) {
    distributionMap[String(group.rating)] = group._count.rating;
  }
  return {
    averageRating: roundedAverage,
    totalReviews: totalReviews,
    distribution: {
      "1": distributionMap["1"],
      "2": distributionMap["2"],
      "3": distributionMap["3"],
      "4": distributionMap["4"],
      "5": distributionMap["5"],
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
// export async function getEcommerceMallAdminProductsProductIdRatingStatistics(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductRatingStatistic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------