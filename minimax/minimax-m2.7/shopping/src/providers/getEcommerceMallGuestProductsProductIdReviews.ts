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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallGuestProductsProductIdReviews(props: {
  guest: GuestPayload;
  productId: string & tags.Format<"uuid">;
  query?: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = Math.max(1, props.query?.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.query?.limit ?? 20));
  const skip = (page - 1) * limit;
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      rating: true,
      content: true,
      created_at: true,
      customer: {
        select: {
          id: true,
          profile: {
            select: {
              display_name: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reviews.map(
      (review): IEcommerceMallReview.ISummary => ({
        createdAt: toISOStringSafe(review.created_at),
        newContent: review.content,
        newRating: review.rating,
        previousContent: review.content,
        previousRating: review.rating,
        reviewId: review.id,
      }),
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
// import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallGuestProductsProductIdReviews(props: {
//   guest: GuestPayload;
//   productId: string & tags.Format<"uuid">;
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