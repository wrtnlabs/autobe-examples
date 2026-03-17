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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorReviewsReviewIdSnapshots(props: {
  administrator: AdministratorPayload;
  reviewId: string;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // Verify review exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Determine sort order (default: ascending/oldest first for chronological order)
  const sortValue = props.body.sort ?? "created_at";
  const orderBy = sortValue.startsWith("-")
    ? { created_at: "desc" as const }
    : { created_at: "asc" as const };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: { shopping_mall_review_id: props.reviewId },
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
      },
    });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: { shopping_mall_review_id: props.reviewId },
  });
  // Transform to ISummary format
  const data = snapshots.map(
    (snapshot) =>
      ({
        id: snapshot.id,
        rating: snapshot.rating,
        content: snapshot.content,
        created_at: toISOStringSafe(snapshot.created_at),
      }) satisfies IShoppingMallReviewSnapshot.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallReviewSnapshot.ISummary;
}
