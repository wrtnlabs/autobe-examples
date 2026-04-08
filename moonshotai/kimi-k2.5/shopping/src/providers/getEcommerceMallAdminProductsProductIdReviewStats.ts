import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
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

export async function getEcommerceMallAdminProductsProductIdReviewStats(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get aggregate statistics (average and count)
  const aggregate = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });
  // Get rating distribution
  const distributionGroups =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    });
  // Build distribution object
  const distribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const group of distributionGroups) {
    const ratingKey = group.rating.toString() as "1" | "2" | "3" | "4" | "5";
    distribution[ratingKey] = group._count.id;
  }
  const averageRating = aggregate._avg.rating ?? 0;
  const totalCount = aggregate._count.id;
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalCount,
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
// export async function getEcommerceMallAdminProductsProductIdReviewStats(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductReviewStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------