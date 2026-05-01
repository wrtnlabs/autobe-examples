import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReviewReview.IRequest;
}): Promise<IPageIShoppingMallReviewReview.ISummary> {
  const body = props.body;
  const limit = Math.min(body.limit || 20, 100);
  const sortField = body.sortField ?? "created_at";
  const sortDirection = body.sortDirection ?? "desc";
  const whereInput: Prisma.shopping_mall_review_reviewsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  if (body.productId) {
    whereInput.shopping_mall_product_id = body.productId;
  }
  if (body.orderId) {
    whereInput.shopping_mall_order_id = body.orderId;
  }
  if (body.orderItemId) {
    whereInput.shopping_mall_order_item_id = body.orderItemId;
  }
  if (body.rating !== undefined) {
    whereInput.rating = body.rating;
  } else if (body.ratingMin !== undefined || body.ratingMax !== undefined) {
    whereInput.rating = {
      ...(body.ratingMin !== undefined ? { gte: body.ratingMin } : {}),
      ...(body.ratingMax !== undefined ? { lte: body.ratingMax } : {}),
    };
  }
  if (body.contentSearch) {
    whereInput.content = {
      contains: body.contentSearch,
      mode: "insensitive",
    } satisfies Prisma.StringNullableFilter;
  }
  if (body.createdFrom || body.createdTo) {
    whereInput.created_at = {
      ...(body.createdFrom ? { gte: body.createdFrom } : {}),
      ...(body.createdTo ? { lte: body.createdTo } : {}),
    } satisfies Prisma.DateTimeNullableFilter;
  }
  if (body.updatedFrom || body.updatedTo) {
    whereInput.updated_at = {
      ...(body.updatedFrom ? { gte: body.updatedFrom } : {}),
      ...(body.updatedTo ? { lte: body.updatedTo } : {}),
    } satisfies Prisma.DateTimeNullableFilter;
  }
  let skip: number;
  let currentPage: number;
  if (body.cursor) {
    skip = 0;
    currentPage = 1;
    const operator = sortDirection === "desc" ? "lt" : "gt";
    if (sortField === "rating") {
      const cursorValue: number = Number(body.cursor);
      const existing = whereInput.rating;
      if (
        existing !== undefined &&
        existing !== null &&
        typeof existing !== "number"
      ) {
        whereInput.rating = {
          ...existing,
          [operator]: cursorValue,
        };
      } else {
        whereInput.rating = {
          [operator]: cursorValue,
        };
      }
    } else if (sortField === "created_at") {
      const existing = whereInput.created_at;
      if (
        existing !== undefined &&
        existing !== null &&
        typeof existing !== "string"
      ) {
        whereInput.created_at = {
          ...existing,
          [operator]: body.cursor,
        };
      } else {
        whereInput.created_at = {
          [operator]: body.cursor,
        };
      }
    } else {
      const existing = whereInput.updated_at;
      if (
        existing !== undefined &&
        existing !== null &&
        typeof existing !== "string"
      ) {
        whereInput.updated_at = {
          ...existing,
          [operator]: body.cursor,
        };
      } else {
        whereInput.updated_at = {
          [operator]: body.cursor,
        };
      }
    }
  } else {
    currentPage = body.page ?? 1;
    skip = (currentPage - 1) * limit;
  }
  const orderBy = {
    [sortField]: sortDirection,
  } satisfies Prisma.shopping_mall_review_reviewsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.shopping_mall_review_reviews.findMany({
    ...ShoppingMallReviewReviewAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy,
  });
  const total = await MyGlobal.prisma.shopping_mall_review_reviews.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallReviewReviewAtSummaryTransformer.transform,
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
// import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
// import { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallReviewReview.IRequest;
// }): Promise<IPageIShoppingMallReviewReview.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_review_reviews.findMany({
//     ...ShoppingMallReviewReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallReviewReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------