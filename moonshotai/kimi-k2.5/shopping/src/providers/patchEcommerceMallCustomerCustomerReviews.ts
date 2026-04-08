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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const ratingFilter: Prisma.ecommerce_mall_reviewsWhereInput["rating"] =
    props.body.minRating !== null || props.body.maxRating !== null
      ? {
          ...(props.body.minRating !== null && { gte: props.body.minRating }),
          ...(props.body.maxRating !== null && { lte: props.body.maxRating }),
        }
      : undefined;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: props.body.includeDeleted === true ? undefined : null,
    ...(props.body.productId !== null && { product_id: props.body.productId }),
    ...(ratingFilter !== undefined && { rating: ratingFilter }),
    ...(props.body.createdAfter !== null && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== null && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.search !== null &&
      props.body.search !== "" && {
        content: { contains: props.body.search, mode: "insensitive" as const },
      }),
  };
  const orderByMap = {
    newest: { created_at: "desc" as const },
    oldest: { created_at: "asc" as const },
    highestRating: { rating: "desc" as const },
    lowestRating: { rating: "asc" as const },
  };
  const records = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByMap[props.body.sort],
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomerReviews(props: {
//   customer: CustomerPayload;
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