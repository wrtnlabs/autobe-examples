import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerReviewsMetrics(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallReview> {
  const result = await MyGlobal.prisma.$queryRaw`SELECT
    AVG(rating) as averageRating,
    COUNT(*) as totalCount,
    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating1Count,
    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating2Count,
    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating3Count,
    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating4Count,
    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating5Count
  FROM shopping_mall_reviews`;
  // Assert the structure of the result array before accessing properties
  const typedResult = typia.assert<
    [
      {
        averageRating: number;
        totalCount: number;
        rating1Count: number;
        rating2Count: number;
        rating3Count: number;
        rating4Count: number;
        rating5Count: number;
      },
    ]
  >(result);
  // Ensure all fields are guaranteed number type after raw query
  return {
    averageRating: typedResult[0].averageRating ?? 0,
    totalCount: typedResult[0].totalCount || 0,
    rating1Count: typedResult[0].rating1Count || 0,
    rating2Count: typedResult[0].rating2Count || 0,
    rating3Count: typedResult[0].rating3Count || 0,
    rating4Count: typedResult[0].rating4Count || 0,
    rating5Count: typedResult[0].rating5Count || 0,
  };
}
