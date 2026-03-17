import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerAdminPromotionRequestsPromotionRequestIdSnapshots(props: {
  seller: SellerPayload;
  promotionRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequestSnapshot> {
  // Authorization: Verify promotion request exists and seller is the requester
  const promotionRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findFirst({
      where: {
        id: props.promotionRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (promotionRequest === null) {
    throw new HttpException("Promotion request not found", 404);
  }
  // Check if seller is the requester via subtype table
  const sellerRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_sellers.findFirst(
      {
        where: {
          admin_promotion_request_id: props.promotionRequestId,
          seller_id: props.seller.id,
        },
        select: { id: true },
      },
    );
  if (sellerRequest === null) {
    throw new HttpException(
      "Forbidden - You can only view snapshots of your own promotion requests",
      403,
    );
  }
  // Build created_at range filter
  const createdAtFilter:
    | Prisma.DateTimeFilter<"ecommerce_mall_admin_promotion_request_snapshots">
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  // Build complete where clause with all filters
  const finalWhere: Prisma.ecommerce_mall_admin_promotion_request_snapshotsWhereInput =
    {
      admin_promotion_request_id: props.promotionRequestId,
      ...(props.body.previousStatus !== undefined && {
        previous_status: props.body.previousStatus,
      }),
      ...(props.body.newStatus !== undefined && {
        new_status: props.body.newStatus,
      }),
      ...(props.body.previousReviewerId !== undefined && {
        previous_reviewer_id: props.body.previousReviewerId,
      }),
      ...(props.body.newReviewerId !== undefined && {
        new_reviewer_id: props.body.newReviewerId,
      }),
      ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    };
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute query and count in parallel
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        admin_promotion_request_id: true,
        previous_status: true,
        new_status: true,
        previous_reason: true,
        new_reason: true,
        created_at: true,
        previousReviewer: {
          select: {
            id: true,
            email: true,
            grade: true,
            status: true,
            nickname: true,
            created_at: true,
          },
        },
        newReviewer: {
          select: {
            id: true,
            email: true,
            grade: true,
            status: true,
            nickname: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.count({
      where: finalWhere,
    }),
  ]);
  // Transform to DTO
  const data: IEcommerceMallAdminPromotionRequestSnapshot[] = snapshots.map(
    (snapshot) => {
      const previousReviewer: IEcommerceMallAdmin.ISummary | null =
        snapshot.previousReviewer === null
          ? null
          : {
              id: snapshot.previousReviewer.id,
              email: snapshot.previousReviewer.email,
              grade: snapshot.previousReviewer.grade,
              status: snapshot.previousReviewer.status,
              nickname: snapshot.previousReviewer.nickname,
              createdAt: toISOStringSafe(snapshot.previousReviewer.created_at),
            };
      const newReviewer: IEcommerceMallAdmin.ISummary | null =
        snapshot.newReviewer === null
          ? null
          : {
              id: snapshot.newReviewer.id,
              email: snapshot.newReviewer.email,
              grade: snapshot.newReviewer.grade,
              status: snapshot.newReviewer.status,
              nickname: snapshot.newReviewer.nickname,
              createdAt: toISOStringSafe(snapshot.newReviewer.created_at),
            };
      const result: IEcommerceMallAdminPromotionRequestSnapshot = {
        id: snapshot.id,
        adminPromotionRequestId: snapshot.admin_promotion_request_id,
        previousStatus: snapshot.previous_status as
          | "pending"
          | "approved"
          | "rejected",
        newStatus: snapshot.new_status as "approved" | "rejected",
        previousReason: snapshot.previous_reason,
        newReason: snapshot.new_reason,
        createdAt: toISOStringSafe(snapshot.created_at),
        previousReviewer,
        newReviewer,
      };
      return result;
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data,
    pagination,
  };
}
