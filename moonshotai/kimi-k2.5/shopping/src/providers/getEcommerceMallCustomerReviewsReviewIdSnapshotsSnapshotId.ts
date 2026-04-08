import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  reviewId: string;
  snapshotId: string;
}): Promise<IEcommerceMallReviewSnapshot> {
  // 获取快照并关联评论信息进行权限验证
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findUnique({
      where: { id: props.snapshotId },
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        ecommerce_mall_review_id: true,
        review: {
          select: {
            customer_id: true,
          },
        },
      },
    });
  if (snapshot === null) {
    throw new HttpException("Review snapshot not found", 404);
  }
  // 验证快照属于指定的评论
  if (snapshot.ecommerce_mall_review_id !== props.reviewId) {
    throw new HttpException("Review snapshot not found", 404);
  }
  // 验证当前客户是评论的作者
  if (snapshot.review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 手动转换响应（避免额外的 select 查询）
  return {
    id: snapshot.id,
    reviewId: snapshot.ecommerce_mall_review_id,
    rating: snapshot.rating,
    content: snapshot.content,
    createdAt: snapshot.created_at.toISOString(),
  };
}
