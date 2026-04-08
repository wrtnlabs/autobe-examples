import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
  // Verify product exists - throws 404 if not found
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build where clause for filtering
  const where: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
  };
  // Exclude soft-deleted reviews by default
  if (props.body.includeDeleted !== true) {
    where.deleted_at = null;
  }
  // Filter by customer ID
  if (props.body.customerId !== null) {
    where.customer_id = props.body.customerId;
  }
  // Filter by rating range
  if (props.body.minRating !== null || props.body.maxRating !== null) {
    where.rating = {};
    if (props.body.minRating !== null) {
      where.rating.gte = props.body.minRating;
    }
    if (props.body.maxRating !== null) {
      where.rating.lte = props.body.maxRating;
    }
  }
  // Filter by date range
  if (props.body.createdAfter !== null || props.body.createdBefore !== null) {
    where.created_at = {};
    if (props.body.createdAfter !== null) {
      where.created_at.gt = new Date(props.body.createdAfter);
    }
    if (props.body.createdBefore !== null) {
      where.created_at.lt = new Date(props.body.createdBefore);
    }
  }
  // Filter by text search on content
  if (props.body.search !== null) {
    where.content = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "highestRating"
        ? { rating: "desc" }
        : props.body.sort === "lowestRating"
          ? { rating: "asc" }
          : { created_at: "desc" };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch reviews with filtering, sorting, and pagination
  const records = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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