import { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallReviewSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorReviewsReviewIdSnapshots(props: {
  administrator: AdministratorPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IECommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIECommerceMallReviewSnapshot.ISummary> {
  // Verify the review exists (404 if not found)
  await MyGlobal.prisma.e_commerce_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true },
  });
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause (immutable, no Date type usage)
  const created_atFilter =
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? ({
          ...(props.body.created_at_from !== undefined && {
            gte: props.body.created_at_from,
          }),
          ...(props.body.created_at_to !== undefined && {
            lte: props.body.created_at_to,
          }),
        } satisfies Prisma.DateTimeFilter)
      : undefined;
  const whereInput = {
    e_commerce_mall_review_id: props.reviewId,
    ...(props.body.changed_fields !== undefined && {
      changed_fields: props.body.changed_fields,
    }),
    ...(created_atFilter !== undefined && {
      created_at: created_atFilter,
    }),
  } satisfies Prisma.e_commerce_mall_review_snapshotsWhereInput;
  // Sequential: count first
  const total = await MyGlobal.prisma.e_commerce_mall_review_snapshots.count({
    where: whereInput,
  });
  // Then query paginated data
  const snapshots =
    await MyGlobal.prisma.e_commerce_mall_review_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallReviewSnapshotAtSummaryTransformer.select(),
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      ECommerceMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallReviewSnapshot.ISummary;
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
// import { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
// import { IPageIECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReviewSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorReviewsReviewIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IECommerceMallReviewSnapshot.IRequest;
// }): Promise<IPageIECommerceMallReviewSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_review_snapshots.findMany({
//     ...ECommerceMallReviewSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallReviewSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------