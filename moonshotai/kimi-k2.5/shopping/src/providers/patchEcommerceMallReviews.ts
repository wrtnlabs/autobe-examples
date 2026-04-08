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

export async function patchEcommerceMallReviews(props: {
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: props.body.includeDeleted ? undefined : null,
    ...(props.body.productId && { product_id: props.body.productId }),
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    ...(props.body.minRating !== null && props.body.maxRating !== null
      ? { rating: { gte: props.body.minRating, lte: props.body.maxRating } }
      : props.body.minRating !== null
        ? { rating: { gte: props.body.minRating } }
        : props.body.maxRating !== null
          ? { rating: { lte: props.body.maxRating } }
          : {}),
    ...(props.body.createdAfter && {
      created_at: { gt: props.body.createdAfter },
    }),
    ...(props.body.createdBefore && {
      created_at: { lt: props.body.createdBefore },
    }),
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  const orderBy: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "highestRating"
        ? { rating: "desc" }
        : props.body.sort === "lowestRating"
          ? { rating: "asc" }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
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
    } satisfies IPage.IPagination,
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
// export async function patchEcommerceMallReviews(props: {
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