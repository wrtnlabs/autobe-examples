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
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIShoppingMallReviewSnapshot> {
  // Extract pagination from props, with defaults
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query review snapshots ordered chronologically
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        review_id: props.reviewId,
      },
      orderBy: {
        created_at: "asc",
      },
      skip,
      take: limit,
    });
  // Count total snapshots matching criteria
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      review_id: props.reviewId,
    },
  });
  // Transform snapshots to IShoppingMallReviewSnapshot format
  const transformedSnapshots: IShoppingMallReviewSnapshot[] = snapshots.map(
    (snapshot) => ({
      totalNonDeletedCount: 0,
      totalUserDeletedCount: 0,
      totalAdminDeletedCount: 0,
      averageRating: 0,
    }),
  );
  // Return paginated results
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedSnapshots,
  };
}
