import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewSnapshotsIndexTransformer } from "../transformers/ShoppingMallReviewSnapshotsIndexTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberReviewsReviewIdSnapshotIndicesSnapshotIndexId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotIndexId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshotsIndex> {
  const snapshotIndex =
    await MyGlobal.prisma.shopping_mall_review_snapshots_indices.findFirst({
      where: {
        id: props.snapshotIndexId,
        review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotsIndexTransformer.select(),
    });
  if (snapshotIndex === null) {
    throw new HttpException("Not Found", 404);
  }
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
    },
    select: {
      shopping_mall_customer_id: true,
    },
  });
  if (review === null || review.shopping_mall_customer_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot = await MyGlobal.prisma.shopping_mall_snapshots.findFirst({
    where: {
      id: snapshotIndex.shopping_mall_snapshot_id,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (snapshot === null) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallReviewSnapshotsIndexTransformer.transform(
    snapshotIndex,
  );
}
