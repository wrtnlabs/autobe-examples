import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviewsReviewIdSnapshotIndices(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshotsIndex.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshotsIndex.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = (props.body
    .page ?? 1) as unknown as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = (props.body
    .limit ?? 20) as unknown as number & tags.Type<"int32"> & tags.Minimum<0>;
  const sortDirection = (props.body.sortDirection ?? "asc") satisfies
    | "asc"
    | "desc";
  const includeDeleted = props.body.includeDeleted ?? false;
  await props.admin;
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true },
  });
  const where = {
    review_id: props.reviewId,
    ...(includeDeleted ? {} : { deleted_at: null }),
  } satisfies Prisma.shopping_mall_review_snapshots_indicesWhereInput;
  const orderBy =
    sortDirection === "asc"
      ? ([
          { snapshot_sequence: "asc" },
          { created_at: "asc" },
        ] satisfies Prisma.shopping_mall_review_snapshots_indicesOrderByWithRelationInput[])
      : ([
          { snapshot_sequence: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.shopping_mall_review_snapshots_indicesOrderByWithRelationInput[]);
  const records =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.count({
      where,
    });
  const items =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        review_id: true,
        action_type: true,
        snapshot_sequence: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    data: items.map(
      (r) =>
        ({
          id: r.id,
          shoppingMallSnapshotId: r.shopping_mall_snapshot_id,
          reviewId: r.review_id,
          actionType: r.action_type,
          snapshotSequence: r.snapshot_sequence,
          createdAt: toISOStringSafe(r.created_at),
          updatedAt: toISOStringSafe(r.updated_at),
          deletedAt:
            r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
        }) satisfies IShoppingMallReviewSnapshotsIndex.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
  } satisfies IPageIShoppingMallReviewSnapshotsIndex.ISummary;
}
