import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
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

export async function getEcommerceMallGuestProductsProductIdReviewStats(props: {
  guest: GuestPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Calculate average rating and total count from non-deleted reviews
  const aggregateResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });
  // Calculate distribution by rating values
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });
  // Build distribution map with default 0 values
  const distributionMap = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);
  for (const group of distributionResult) {
    distributionMap.set(group.rating, group._count.rating);
  }
  return {
    averageRating: Math.round((aggregateResult._avg.rating ?? 0) * 10) / 10,
    totalCount: aggregateResult._count.rating ?? 0,
    distribution: {
      "1": distributionMap.get(1) ?? 0,
      "2": distributionMap.get(2) ?? 0,
      "3": distributionMap.get(3) ?? 0,
      "4": distributionMap.get(4) ?? 0,
      "5": distributionMap.get(5) ?? 0,
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
// import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallGuestProductsProductIdReviewStats(props: {
//   guest: GuestPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductReviewStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------