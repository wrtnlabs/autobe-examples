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
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsMetricsAnalytics(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // Use default pagination values from specification (page=1, limit=100)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query total count of non-deleted reviews (admin-deleted reviews are excluded)
  // Customer-deleted reviews are included, per business requirements
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: {
      deleted_at: null, // Excludes admin-deleted reviews
    },
  });
  // Calculate overall platform metrics
  const aggregateResult = await MyGlobal.prisma.shopping_mall_reviews.aggregate(
    {
      where: {
        deleted_at: null, // Excludes admin-deleted reviews
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    },
  );
  // Create the single review summary with proper types
  const data: IShoppingMallReview.ISummary[] = [
    {
      averageRating: aggregateResult._avg.rating
        ? Number(aggregateResult._avg.rating)
        : 0,
      reviewCount: aggregateResult._count.id || 0,
    },
  ];
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
