import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const { body, productId } = props;
  // Build the where clause
  const whereClause: Prisma.ecommerce_mall_reviewsWhereInput = {
    ecommerce_mall_product_id: productId,
  };
  // Exclude soft-deleted unless explicitly requested
  if (body.deleted !== true) {
    whereClause.deleted_at = null;
  }
  // Apply rating filters - if exact rating provided, use it directly
  if (body.rating !== undefined) {
    whereClause.rating = body.rating;
  } else {
    // For range filters, build an object with gte/lte
    const ratingFilter: Prisma.IntFilter = {};
    if (body.minRating !== undefined) {
      ratingFilter.gte = body.minRating;
    }
    if (body.maxRating !== undefined) {
      ratingFilter.lte = body.maxRating;
    }
    if (Object.keys(ratingFilter).length > 0) {
      whereClause.rating = ratingFilter;
    }
  }
  // Apply date range filters using ISO string format directly
  // Prisma accepts ISO 8601 strings for datetime filtering
  if (body.createdAtFrom !== undefined || body.createdAtTo !== undefined) {
    whereClause.created_at = {};
    if (body.createdAtFrom !== undefined) {
      whereClause.created_at.gte = body.createdAtFrom;
    }
    if (body.createdAtTo !== undefined) {
      whereClause.created_at.lte = body.createdAtTo;
    }
  }
  // Pagination setup
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  // Apply cursor-based pagination if cursor is provided
  // Cursor format: "createdAt|id"
  let skipValue = skip;
  if (body.cursor !== undefined) {
    const cursorParts = body.cursor.split("|");
    if (cursorParts.length === 2) {
      const [cursorCreatedAt, cursorId] = cursorParts;
      // Use cursor for pagination: get records created before cursor
      // For stable ordering, also filter by id when created_at is equal
      whereClause.AND = [
        {
          OR: [
            { created_at: { lt: cursorCreatedAt } },
            {
              created_at: cursorCreatedAt,
              id: { lt: cursorId },
            },
          ],
        },
      ];
      skipValue = 0; // Reset skip when using cursor
    }
  }
  // Fetch records with pagination
  const records = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
    take: limit,
    skip: skipValue,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const totalRecords = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
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
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProductsProductIdReviews(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallReview.IRequest;
// }): Promise<IPageIEcommerceMallReview.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
//     ...EcommerceMallReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------