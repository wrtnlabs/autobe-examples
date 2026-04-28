import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformReviewAtSummaryTransformer } from "../transformers/EcommercePlatformReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformReview.IRequest;
}): Promise<IPageIEcommercePlatformReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const ratingWhere = {
    ...(props.body.minRating !== undefined && { gte: props.body.minRating }),
    ...(props.body.maxRating !== undefined && { lte: props.body.maxRating }),
  } satisfies Prisma.IntFilter;
  const createdAtWhere = {
    ...(props.body.createdAtFrom !== undefined && {
      gte: props.body.createdAtFrom,
    }),
    ...(props.body.createdAtTo !== undefined && {
      lte: props.body.createdAtTo,
    }),
  } satisfies Prisma.DateTimeFilter;
  const updatedAtWhere = {
    ...(props.body.updatedAtFrom !== undefined && {
      gte: props.body.updatedAtFrom,
    }),
    ...(props.body.updatedAtTo !== undefined && {
      lte: props.body.updatedAtTo,
    }),
  } satisfies Prisma.DateTimeFilter;
  const whereInput = {
    deleted_at: null,
    ...(props.body.productId !== undefined && {
      ecommerce_platform_product_id: props.body.productId,
    }),
    ...(props.body.customerId !== undefined && {
      ecommerce_platform_customer_id: props.body.customerId,
    }),
    ...(props.body.orderId !== undefined && {
      ecommerce_platform_order_id: props.body.orderId,
    }),
    ...(props.body.search !== undefined && {
      text_content: { contains: props.body.search },
    }),
    ...(Object.keys(ratingWhere).length > 0 && { rating: ratingWhere }),
    ...(Object.keys(createdAtWhere).length > 0 && {
      created_at: createdAtWhere,
    }),
    ...(Object.keys(updatedAtWhere).length > 0 && {
      updated_at: updatedAtWhere,
    }),
  } satisfies Prisma.ecommerce_platform_reviewsWhereInput;
  const records = await MyGlobal.prisma.ecommerce_platform_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommercePlatformReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_reviews.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformReviewAtSummaryTransformer.transform,
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
// import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
// import { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformReview.IRequest;
// }): Promise<IPageIEcommercePlatformReview.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_reviews.findMany({
//     ...EcommercePlatformReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------