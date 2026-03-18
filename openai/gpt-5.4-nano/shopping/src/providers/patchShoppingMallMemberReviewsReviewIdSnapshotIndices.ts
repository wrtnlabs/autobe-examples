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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberReviewsReviewIdSnapshotIndices(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshotsIndex.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshotsIndex.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { shopping_mall_customer_id: true },
  });
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const includeDeleted = props.body.includeDeleted ?? false;
  const sortDirection = props.body.sortDirection ?? "asc";
  const where = {
    review_id: props.reviewId,
    ...(includeDeleted ? {} : { deleted_at: null }),
  } satisfies Prisma.shopping_mall_review_snapshots_indicesWhereInput;
  const orderBy =
    sortDirection === "desc"
      ? ([
          { snapshot_sequence: "desc" },
          { created_at: "desc" },
          { id: "desc" },
        ] satisfies Prisma.shopping_mall_review_snapshots_indicesOrderByWithRelationInput[])
      : ([
          { snapshot_sequence: "asc" },
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_review_snapshots_indicesOrderByWithRelationInput[]);
  const data =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findMany({
      where,
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
      skip,
      take: limit,
      orderBy,
    });
  const records =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.count({
      where,
    });
  return {
    data: data.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      shoppingMallSnapshotId: row.shopping_mall_snapshot_id as string &
        tags.Format<"uuid">,
      reviewId: row.review_id as string & tags.Format<"uuid">,
      actionType: row.action_type,
      snapshotSequence: row.snapshot_sequence,
      createdAt: row.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: row.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deletedAt:
        row.deleted_at === null
          ? null
          : (row.deleted_at.toISOString() as string & tags.Format<"date-time">),
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(records / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
