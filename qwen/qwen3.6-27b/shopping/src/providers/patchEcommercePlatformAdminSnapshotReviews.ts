import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotReviewAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminSnapshotReviews(props: {
  snapshotReviewId: string & tags.Format<"uuid">;
  body: Partial<IEcommercePlatformSnapshotReview.IRequest>;
}): Promise<IEcommercePlatformSnapshotReview.ISummary> {
  // Validate the snapshot review exists before update
  const existing =
    await MyGlobal.prisma.ecommerce_platform_snapshot_reviews.findUniqueOrThrow(
      {
        where: { id: props.snapshotReviewId },
      },
    );
  // Construct update data from optional fields in request body
  const updateData: object = Object.assign(
    {},
    ...(props.body.previous_rating !== undefined
      ? [{ previous_rating: props.body.previous_rating }]
      : []),
    ...(props.body.previous_content !== undefined
      ? [{ previous_content: props.body.previous_content }]
      : []),
    ...(props.body.new_rating !== undefined
      ? [{ new_rating: props.body.new_rating }]
      : []),
    ...(props.body.new_content !== undefined
      ? [{ new_content: props.body.new_content }]
      : []),
  );
  // Perform the update and get the result with proper select
  const updated =
    await MyGlobal.prisma.ecommerce_platform_snapshot_reviews.update({
      where: { id: props.snapshotReviewId },
      data: updateData,
      ...EcommercePlatformSnapshotReviewAtSummaryTransformer.select(),
    });
  // Transform and return the result
  return EcommercePlatformSnapshotReviewAtSummaryTransformer.transform(updated);
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
// import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
// import { IPageIEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotReview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminSnapshotReviews(props: {
//   admin: AdminPayload;
//   body: IEcommercePlatformSnapshotReview.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotReview.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_reviews.findMany({
//     ...EcommercePlatformSnapshotReviewAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotReviewAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------