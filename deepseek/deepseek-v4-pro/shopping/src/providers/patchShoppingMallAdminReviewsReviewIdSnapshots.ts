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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewReviewSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_review_review_id: props.reviewId,
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to !== undefined
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.rating_min !== undefined ||
    props.body.rating_max !== undefined
      ? {
          rating: {
            ...(props.body.rating_min !== undefined
              ? { gte: props.body.rating_min }
              : {}),
            ...(props.body.rating_max !== undefined
              ? { lte: props.body.rating_max }
              : {}),
          },
        }
      : {}),
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
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewReviewSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
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
// import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
// import { IPageIShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminReviewsReviewIdSnapshots(props: {
//   admin: AdminPayload;
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