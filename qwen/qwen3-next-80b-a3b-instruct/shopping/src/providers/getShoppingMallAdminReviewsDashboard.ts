import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsDashboard(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallReviewSnapshot> {
  // Query review snapshots with aggregate counts by deletion status
  const results = await MyGlobal.prisma.shopping_mall_review_snapshots.groupBy({
    by: [
      Prisma.Shopping_mall_review_snapshotsScalarFieldEnum.deleted_by_system,
    ],
    _count: {
      review_id: true,
    },
    _avg: {
      rating: true,
    },
  });
  // Initialize counters
  let totalNonDeletedCount = 0;
  let totalUserDeletedCount = 0;
  let totalAdminDeletedCount = 0;
  let totalRatingSum = 0;
  let nonDeletedReviewCount = 0;
  // Process each group by deletion status
  for (const group of results) {
    const count = group._count?.review_id ?? 0;
    const avgRating = group._avg?.rating ?? 0;
    const deletedBySystem = group.deleted_by_system;
    if (deletedBySystem === null) {
      // Non-deleted reviews
      totalNonDeletedCount = count;
      nonDeletedReviewCount = count;
      totalRatingSum = avgRating * count;
    } else if (deletedBySystem === "user") {
      // User-deleted reviews
      totalUserDeletedCount = count;
    } else if (deletedBySystem === "admin") {
      // Admin-deleted reviews
      totalAdminDeletedCount = count;
    }
  }
  // Calculate average rating across non-deleted reviews
  const averageRating =
    nonDeletedReviewCount > 0
      ? Number((totalRatingSum / nonDeletedReviewCount).toFixed(1))
      : 0;
  return {
    totalNonDeletedCount,
    totalUserDeletedCount,
    totalAdminDeletedCount,
    averageRating: averageRating as number &
      tags.Minimum<0> &
      tags.Maximum<5> &
      tags.MultipleOf<0.1>,
  };
}
