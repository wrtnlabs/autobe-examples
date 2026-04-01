import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot.ISummary> {
  const page = parseInt(props.body.page ?? "1", 10) || 1;
  const limit =
    parseInt(
      (
        props.body.pageSize ??
        props.body.limit?.toString() ??
        "20"
      )?.toString() ?? "20",
      10,
    ) || 20;
  const skip = (page - 1) * Math.min(limit, 100);
  const whereInput: Prisma.ecommerce_mall_review_snapshotsWhereInput = {
    ecommerce_mall_review_id: props.reviewId,
    ...(props.body.snapshotType !== undefined && {
      snapshot_type: props.body.snapshotType,
    }),
    ...(props.body.createdAtGte !== undefined && {
      created_at: { gte: new Date(props.body.createdAtGte) },
    }),
    ...(props.body.createdAtLte !== undefined && {
      created_at: { lte: new Date(props.body.createdAtLte) },
    }),
  } satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
    where: whereInput,
    skip,
    take: Math.min(limit, 100),
    orderBy:
      props.body.ordering === "asc"
        ? { created_at: "asc" }
        : { created_at: "desc" },
    ...EcommerceMallReviewSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: Math.min(limit, 100),
      records: total,
      pages: Math.ceil(total / Math.min(limit, 100)),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallReviewSnapshot.ISummary;
}
