import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: props.body.deleted === true ? { not: null } : null,
    ...(props.body.search !== undefined && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.customerId !== undefined && {
      shopping_mall_customer_id: props.body.customerId,
    }),
    ...(props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
      ? {
          rating: {
            ...(props.body.ratingMin !== undefined && {
              gte: props.body.ratingMin,
            }),
            ...(props.body.ratingMax !== undefined && {
              lte: props.body.ratingMax,
            }),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const orderByInput = (() => {
    if (props.body.sort === undefined) {
      return {
        created_at: "desc" as const,
      } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
    }
    switch (props.body.sort) {
      case "created_at_asc":
        return {
          created_at: "asc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
      case "rating":
      case "rating_desc":
        return {
          rating: "desc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
      case "rating_asc":
        return {
          rating: "asc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
      case "updated_at":
      case "updated_at_desc":
        return {
          updated_at: "desc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
      case "updated_at_asc":
        return {
          updated_at: "asc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
      default:
        return {
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
    }
  })();
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
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
      data,
      ShoppingMallReviewAtSummaryTransformer.transform,
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
// import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
// import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallProductsProductIdReviews(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallReview.IRequest;
// }): Promise<IPageIShoppingMallReview.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_reviews.findMany({
//     ...ShoppingMallReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------