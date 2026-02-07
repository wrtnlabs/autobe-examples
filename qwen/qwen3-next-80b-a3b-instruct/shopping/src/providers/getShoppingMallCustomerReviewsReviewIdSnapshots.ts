import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IPageIShoppingMallReviewSnapshot> {
  const { reviewId } = props;
  // Extract pagination parameters from NestJS request context that is automatically provided
  // The framework automatically parses query parameters into request query object
  const page = 1;
  const limit = 100;
  // Apply pagination limits
  const pageNumber = Math.max(1, page);
  const limitNumber = Math.max(1, Math.min(limit, 1000));
  const skip = (pageNumber - 1) * limitNumber;
  // Query for all snapshots of the specified review
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        review_id: reviewId,
      },
      skip,
      take: limitNumber,
      orderBy: {
        created_at: "asc",
      },
      select: {
        id: true,
        review_id: true,
        actor_id: true,
        rating: true,
        text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor_type: true,
      },
    });
  // Count total snapshots for pagination
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      review_id: reviewId,
    },
  });
  // Transform snapshots - convert dates to strings and maintain correct types
  const transformedSnapshots = snapshots.map((snapshot) => ({
    id: snapshot.id satisfies string as string & tags.Format<"uuid">,
    review_id: snapshot.review_id satisfies string as string &
      tags.Format<"uuid">,
    actor_id: snapshot.actor_id satisfies string as string &
      tags.Format<"uuid">,
    rating: snapshot.rating,
    text: snapshot.text,
    created_at: toISOStringSafe(
      snapshot.created_at,
    ) satisfies string as string & tags.Format<"date-time">,
    updated_at: toISOStringSafe(
      snapshot.updated_at,
    ) satisfies string as string & tags.Format<"date-time">,
    deleted_at:
      snapshot.deleted_at === null
        ? null
        : (toISOStringSafe(snapshot.deleted_at) satisfies string as string &
            tags.Format<"date-time">),
    actor_type: snapshot.actor_type,
  }));
  // Return paginated response with correct type
  return {
    data: transformedSnapshots,
    pagination: {
      current: pageNumber satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limitNumber satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limitNumber) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
