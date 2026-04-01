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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortDirection: "asc" | "desc" = props.body.sortDirection ?? "asc";
  const includeDeleted = props.body.includeDeleted ?? false;
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { shopping_mall_customer_id: true },
  });
  if (review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const indicesWhere: Prisma.shopping_mall_review_snapshots_indicesWhereInput =
    {
      review_id: props.reviewId,
      ...(includeDeleted ? {} : { deleted_at: null }),
    };
  const skip = (page - 1) * limit;
  const indices =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findMany({
      where: indicesWhere,
      skip,
      take: limit,
      orderBy: [
        { snapshot_sequence: sortDirection },
        { created_at: sortDirection },
        { id: "asc" },
      ],
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
  const total =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.count({
      where: indicesWhere,
    });
  const data: IShoppingMallReviewSnapshotsIndex.ISummary[] = indices.map(
    (r) => ({
      id: typia.assert<string & tags.Format<"uuid">>(r.id),
      shoppingMallSnapshotId: typia.assert<string & tags.Format<"uuid">>(
        r.shopping_mall_snapshot_id,
      ),
      reviewId: typia.assert<string & tags.Format<"uuid">>(r.review_id),
      actionType: r.action_type,
      snapshotSequence: r.snapshot_sequence,
      createdAt: typia.assert<string & tags.Format<"date-time">>(
        r.created_at.toISOString(),
      ),
      updatedAt: typia.assert<string & tags.Format<"date-time">>(
        r.updated_at.toISOString(),
      ),
      deletedAt:
        r.deleted_at === null
          ? null
          : typia.assert<string & tags.Format<"date-time">>(
              r.deleted_at.toISOString(),
            ),
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
