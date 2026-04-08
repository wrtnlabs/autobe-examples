import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformReviewSnapshotAtSummaryTransformer } from "../transformers/MallPlatformReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IMallPlatformReviewSnapshot.IRequest;
}): Promise<IPageIMallPlatformReviewSnapshot.ISummary> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy: Prisma.mall_platform_review_snapshotsOrderByWithRelationInput =
    props.body.sort === "snapshotAction"
      ? { snapshot_action: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "content"
        ? { content: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "isDeleted"
          ? { is_deleted: props.body.order === "asc" ? "asc" : "desc" }
          : { created_at: props.body.order === "asc" ? "asc" : "desc" };
  const where = {
    mall_platform_review_id: props.reviewId,
    ...(props.body.snapshotAction !== undefined && {
      snapshot_action: props.body.snapshotAction,
    }),
    ...(props.body.content !== undefined && {
      content: { contains: props.body.content, mode: "insensitive" },
    }),
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          snapshot_action: { contains: props.body.search, mode: "insensitive" },
        },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.mall_platform_review_snapshotsWhereInput;
  const records = await MyGlobal.prisma.mall_platform_review_snapshots.findMany(
    {
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformReviewSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.mall_platform_review_snapshots.count({
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
      records,
      MallPlatformReviewSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
// import { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerReviewsReviewIdSnapshots(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IMallPlatformReviewSnapshot.IRequest;
// }): Promise<IPageIMallPlatformReviewSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_review_snapshots.findMany({
//     ...MallPlatformReviewSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformReviewSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------