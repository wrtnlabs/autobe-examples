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
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsStats(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallReview> {
  const result = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
    where: {
      is_deleted: false,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });
  const averageRating =
    result._avg?.rating !== null
      ? Math.round((result._avg?.rating as number) * 10) / 10
      : 0;
  const totalCount = result._count?.id || 0;
  return {
    averageRating,
    totalCount,
  };
}
