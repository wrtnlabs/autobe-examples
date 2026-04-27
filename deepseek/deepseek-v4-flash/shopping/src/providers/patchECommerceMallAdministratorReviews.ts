import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallReviewAtSummaryTransformer } from "../transformers/ECommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorReviews(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallReview.IRequest;
}): Promise<IPageIECommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_reviewsWhereInput = {
    deleted_at: null,
  };
  if (props.body.productId !== undefined) {
    where.e_commerce_mall_product_id = props.body.productId;
  }
  if (props.body.customerId !== undefined) {
    where.e_commerce_mall_customer_id = props.body.customerId;
  }
  if (
    props.body.minRating !== undefined &&
    props.body.maxRating !== undefined
  ) {
    where.rating = {
      gte: props.body.minRating,
      lte: props.body.maxRating,
    };
  } else if (props.body.minRating !== undefined) {
    where.rating = {
      gte: props.body.minRating,
    };
  } else if (props.body.maxRating !== undefined) {
    where.rating = {
      lte: props.body.maxRating,
    };
  }
  if (props.body.search !== undefined && props.body.search !== null) {
    where.content = {
      contains: props.body.search,
    };
  }
  const orderByInput: Prisma.e_commerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort === "rating"
      ? { rating: props.body.direction ?? "desc" }
      : { created_at: props.body.direction ?? "desc" };
  const records = await MyGlobal.prisma.e_commerce_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ECommerceMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_reviews.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallReview.ISummary;
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
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// import { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorReviews(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallReview.IRequest;
// }): Promise<IPageIECommerceMallReview.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_reviews.findMany({
//     ...ECommerceMallReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------