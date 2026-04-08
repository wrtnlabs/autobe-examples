import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerReviewsReviewIdSnapshots(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_review_id: props.reviewId,
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        created_at: { gte: new Date(props.body.createdAtFrom) },
      }),
  } satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput;
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    whereInput.created_at = {
      ...whereInput.created_at,
      lte: new Date(props.body.createdAtTo),
    };
  }
  const records =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
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
      EcommerceMallReviewSnapshotTransformer.transform,
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
// import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
// import { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerReviewsReviewIdSnapshots(props: {
//   seller: SellerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IEcommerceMallReviewSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallReviewSnapshot> {
//   const records = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
//     ...EcommerceMallReviewSnapshotTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallReviewSnapshotTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------