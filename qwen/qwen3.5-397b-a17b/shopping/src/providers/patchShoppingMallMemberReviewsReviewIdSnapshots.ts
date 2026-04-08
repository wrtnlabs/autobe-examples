import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
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
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberReviewsReviewIdSnapshots(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_member_id: true,
    },
  });
  const isOwner = review.shopping_mall_member_id === props.member.id;
  if (!isOwner) {
    const isAdmin =
      await MyGlobal.prisma.shopping_mall_administrators.findFirst({
        where: {
          shopping_mall_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const rawSort = props.body.sort ?? "-created_at";
  const sortDir = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "");
  const validSortFields = ["created_at", "id", "rating"];
  const orderByField = validSortFields.includes(sortField)
    ? sortField
    : "created_at";
  const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany(
    {
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: {
        [orderByField]: sortDir,
      },
      ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallReviewSnapshot.ISummary;
}
