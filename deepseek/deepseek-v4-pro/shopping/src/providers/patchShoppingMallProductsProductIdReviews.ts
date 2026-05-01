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
import { ShoppingMallReviewReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReview.IRequest;
}): Promise<IPageIShoppingMallReviewReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sortField ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Build orderBy with explicit field matching for type safety
  let orderBy: Prisma.shopping_mall_review_reviewsOrderByWithRelationInput;
  if (sortField === "created_at") {
    orderBy = { created_at: sortDirection };
  } else if (sortField === "updated_at") {
    orderBy = { updated_at: sortDirection };
  } else {
    orderBy = { rating: sortDirection };
  }
  // Build WHERE conditions
  const andConditions: Prisma.shopping_mall_review_reviewsWhereInput[] = [
    { shopping_mall_product_id: props.productId },
  ];
  // Soft-delete filter — always exclude deleted for public endpoint
  andConditions.push({ deleted_at: null });
  // Rating filter — exact takes precedence over range
  if (props.body.rating !== undefined) {
    andConditions.push({ rating: props.body.rating });
  } else {
    if (props.body.ratingMin !== undefined) {
      andConditions.push({ rating: { gte: props.body.ratingMin } });
    }
    if (props.body.ratingMax !== undefined) {
      andConditions.push({ rating: { lte: props.body.ratingMax } });
    }
  }
  // Content search — case-insensitive partial match
  if (props.body.contentSearch !== undefined) {
    andConditions.push({
      content: { contains: props.body.contentSearch, mode: "insensitive" },
    });
  }
  // ID-based filters
  if (props.body.customerId !== undefined) {
    andConditions.push({ shopping_mall_customer_id: props.body.customerId });
  }
  if (props.body.orderId !== undefined) {
    andConditions.push({ shopping_mall_order_id: props.body.orderId });
  }
  if (props.body.orderItemId !== undefined) {
    andConditions.push({
      shopping_mall_order_item_id: props.body.orderItemId,
    });
  }
  // Date range filters
  if (props.body.createdFrom !== undefined) {
    andConditions.push({ created_at: { gte: props.body.createdFrom } });
  }
  if (props.body.createdTo !== undefined) {
    andConditions.push({ created_at: { lte: props.body.createdTo } });
  }
  if (props.body.updatedFrom !== undefined) {
    andConditions.push({ updated_at: { gte: props.body.updatedFrom } });
  }
  if (props.body.updatedTo !== undefined) {
    andConditions.push({ updated_at: { lte: props.body.updatedTo } });
  }
  // Cursor-based pagination overrides offset-based
  let useSkip = skip;
  if (props.body.cursor !== undefined) {
    useSkip = 0;
    if (sortField === "created_at") {
      if (sortDirection === "desc") {
        andConditions.push({ created_at: { lt: props.body.cursor } });
      } else {
        andConditions.push({ created_at: { gt: props.body.cursor } });
      }
    } else if (sortField === "updated_at") {
      if (sortDirection === "desc") {
        andConditions.push({ updated_at: { lt: props.body.cursor } });
      } else {
        andConditions.push({ updated_at: { gt: props.body.cursor } });
      }
    } else {
      const cursorRating = Number(props.body.cursor);
      if (sortDirection === "desc") {
        andConditions.push({ rating: { lt: cursorRating } });
      } else {
        andConditions.push({ rating: { gt: cursorRating } });
      }
    }
  }
  const where: Prisma.shopping_mall_review_reviewsWhereInput = {
    AND: andConditions,
  };
  const data = await MyGlobal.prisma.shopping_mall_review_reviews.findMany({
    where,
    skip: useSkip,
    take: limit,
    orderBy,
    ...ShoppingMallReviewReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_review_reviews.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchShoppingMallProductsProductIdReviews(props: {
//   productId: string & tags.Format<"uuid">;
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