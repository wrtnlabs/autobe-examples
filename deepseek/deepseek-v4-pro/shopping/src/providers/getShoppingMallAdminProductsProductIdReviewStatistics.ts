import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
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

export async function getShoppingMallAdminProductsProductIdReviewStatistics(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewStatistic> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const aggregate =
    await MyGlobal.prisma.shopping_mall_review_reviews.aggregate({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
  const averageRating: number =
    aggregate._avg.rating !== null
      ? Math.round(aggregate._avg.rating * 10) / 10
      : 0.0;
  const totalCount: number = aggregate._count.rating;
  return {
    averageRating,
    totalCount,
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
// import { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminProductsProductIdReviewStatistics(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallReviewStatistic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------