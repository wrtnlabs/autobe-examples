import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorReviewsReviewIdSnapshots(props: {
  administrator: AdministratorPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // Verify the review exists
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
    },
  });
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_review_snapshotsWhereInput = {
    shopping_mall_review_id: props.reviewId,
  };
  // Apply rating_before filter
  if (props.body.rating_before !== undefined) {
    whereInput.rating_before = props.body.rating_before;
  }
  // Apply rating_after filter
  if (props.body.rating_after !== undefined) {
    whereInput.rating_after = props.body.rating_after;
  }
  // Apply text_content_before filter
  if (props.body.text_content_before !== undefined) {
    if (props.body.text_content_before === null) {
      whereInput.text_content_before = null;
    } else {
      whereInput.text_content_before = {
        contains: props.body.text_content_before,
      };
    }
  }
  // Apply text_content_after filter
  if (props.body.text_content_after !== undefined) {
    if (props.body.text_content_after === null) {
      whereInput.text_content_after = null;
    } else {
      whereInput.text_content_after = {
        contains: props.body.text_content_after,
      };
    }
  }
  // Apply deleted_at_before filter (boolean to null/not null)
  if (props.body.deleted_at_before !== undefined) {
    whereInput.deleted_at_before = props.body.deleted_at_before
      ? { not: null }
      : null;
  }
  // Apply deleted_at_after filter (boolean to null/not null)
  if (props.body.deleted_at_after !== undefined) {
    whereInput.deleted_at_after = props.body.deleted_at_after
      ? { not: null }
      : null;
  }
  // Apply created_at range filter
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_from !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Build orderBy clause (default: created_at desc)
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput =
    {
      created_at: sortOrder,
    };
  // Query snapshots
  const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
    },
  );
  // Query total count
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
// import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorReviewsReviewIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IShoppingMallReviewSnapshot.IRequest;
// }): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
//     ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallReviewSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------