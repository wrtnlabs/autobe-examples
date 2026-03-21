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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot> {
  // Validate the review exists
  await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true },
  });
  // Apply pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query review snapshots ordered chronologically (oldest to newest)
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: {
        ecommerce_mall_review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "asc",
      },
      select: {
        id: true,
        rating: true,
        body: true,
        created_at: true,
      },
    });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: {
      ecommerce_mall_review_id: props.reviewId,
    },
  });
  // Map to DTO format
  const data: IEcommerceMallReviewSnapshot[] = snapshots.map((snapshot) => ({
    review_id: props.reviewId,
    id: snapshot.id as string & tags.Format<"uuid">,
    rating: snapshot.rating as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    body: snapshot.body,
    created_at: toISOStringSafe(snapshot.created_at),
  }));
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  };
}
