import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReviewSnapshot";
import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewReviewSnapshot.ISummary> {
  const review =
    await MyGlobal.prisma.shopping_mall_review_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: { shopping_mall_customer_id: true },
    });
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const created_at: Record<string, string> = {};
  if (props.body.created_at_from !== undefined) {
    created_at.gte = props.body.created_at_from;
  }
  if (props.body.created_at_to !== undefined) {
    created_at.lte = props.body.created_at_to;
  }
  const rating: Record<string, number> = {};
  if (props.body.rating_min !== undefined) {
    rating.gte = props.body.rating_min;
  }
  if (props.body.rating_max !== undefined) {
    rating.lte = props.body.rating_max;
  }
  const whereInput = {
    shopping_mall_review_review_id: props.reviewId,
    ...(Object.keys(created_at).length > 0 && { created_at }),
    ...(Object.keys(rating).length > 0 && { rating }),
  } satisfies Prisma.shopping_mall_review_review_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_review_review_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallReviewReviewSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_review_review_snapshots.count({
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
      data,
      ShoppingMallReviewReviewSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
// import { IPageIShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerReviewsReviewIdSnapshots(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IShoppingMallReviewReviewSnapshot.IRequest;
// }): Promise<IPageIShoppingMallReviewReviewSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_review_review_snapshots.findMany({
//     ...ShoppingMallReviewReviewSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallReviewReviewSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------