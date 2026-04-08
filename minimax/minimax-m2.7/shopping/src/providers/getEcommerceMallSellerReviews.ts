import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerReviews(props: {
  seller: SellerPayload;
  query?: {
    page?: number & tags.Type<"int32"> & tags.Minimum<1>;
    limit?: number & tags.Type<"int32"> & tags.Minimum<1>;
    productId?: string & tags.Format<"uuid">;
    customerId?: string & tags.Format<"uuid">;
    minRating?: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;
    maxRating?: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;
    createdAfter?: string & tags.Format<"date-time">;
    createdBefore?: string & tags.Format<"date-time">;
  };
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.query?.page ?? (1 as const);
  const limit = Math.min(props.query?.limit ?? (20 as const), 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const skip = (page - 1) * limit;
  const whereCondition = {
    deleted_at: null,
    product: {
      ecommerce_mall_seller_id: props.seller.id,
    },
    ...(props.query?.productId && {
      product: {
        ecommerce_mall_seller_id: props.seller.id,
        id: props.query.productId,
      },
    }),
    ...(props.query?.customerId && {
      ecommerce_mall_customer_id: props.query.customerId,
    }),
    ...(props.query?.minRating && {
      rating: { gte: props.query.minRating },
    }),
    ...(props.query?.maxRating && {
      rating: { lte: props.query.maxRating },
    }),
    ...(props.query?.createdAfter && {
      created_at: { gte: props.query.createdAfter },
    }),
    ...(props.query?.createdBefore && {
      created_at: { lte: props.query.createdBefore },
    }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      rating: true,
      content: true,
      created_at: true,
      ecommerce_mall_customer_id: true,
      customer: {
        select: {
          id: true,
          deleted_at: true,
          profile: {
            select: {
              display_name: true,
            },
          },
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereCondition,
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: reviews.map((review) => {
      const customerDisplayName =
        review.customer.deleted_at !== null
          ? "deleted user"
          : (review.customer.profile?.display_name ?? "unknown user");
      return {
        createdAt: toISOStringSafe(review.created_at),
        newContent: review.content,
        newRating: review.rating as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        previousContent: null,
        previousRating: review.rating as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        reviewId: review.id as string & tags.Format<"uuid">,
      } satisfies IEcommerceMallReview.ISummary;
    }),
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
// import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerReviews(props: {
//   seller: SellerPayload;
// }): Promise<IPageIEcommerceMallReview.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
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