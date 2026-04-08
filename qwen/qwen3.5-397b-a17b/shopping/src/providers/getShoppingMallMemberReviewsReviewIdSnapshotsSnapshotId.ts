import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberReviewsReviewIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { shopping_mall_member_id: true },
  });
  if (review.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
