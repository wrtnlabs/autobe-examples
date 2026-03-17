import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
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

export async function patchEcommerceMallSellerPendingRequestsSummary(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause dynamically
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    status: "pending",
    deleted_at: null,
  };
  // Add optional filters
  if (props.body.reviewerId !== undefined && props.body.reviewerId !== null) {
    where.reviewer_id = props.body.reviewerId;
  }
  // Handle date range filters with proper merging
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.submittedAtFrom !== undefined &&
    props.body.submittedAtFrom !== null
  ) {
    createdAtFilter.gte = new Date(props.body.submittedAtFrom);
  }
  if (
    props.body.submittedAtTo !== undefined &&
    props.body.submittedAtTo !== null
  ) {
    createdAtFilter.lte = new Date(props.body.submittedAtTo);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }
  const updatedAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.reviewedAtFrom !== undefined &&
    props.body.reviewedAtFrom !== null
  ) {
    updatedAtFilter.gte = new Date(props.body.reviewedAtFrom);
  }
  if (
    props.body.reviewedAtTo !== undefined &&
    props.body.reviewedAtTo !== null
  ) {
    updatedAtFilter.lte = new Date(props.body.reviewedAtTo);
  }
  if (Object.keys(updatedAtFilter).length > 0) {
    where.updated_at = updatedAtFilter;
  }
  // Note: requesterType and requesterId filters would require polymorphic joins
  // These are handled at application level if needed, or via raw queries if complex
  // Sequential queries - first findMany, then count
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: {
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
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
    });
  // Transform to response DTO
  const transformedData: IEcommerceMallAdminPromotionRequest.ISummary[] =
    data.map((record) => {
      return {
        id: record.id,
        status: record.status,
        reason: record.reason,
        createdAt: toISOStringSafe(record.created_at),
        updatedAt: toISOStringSafe(record.updated_at),
        deletedAt: record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : null,
        reviewer: record.reviewer
          ? ({
              id: record.reviewer.id,
              email: record.reviewer.email,
              grade: record.reviewer.grade,
              status: record.reviewer.status,
              nickname: record.reviewer.nickname,
              createdAt: toISOStringSafe(record.reviewer.created_at),
            } satisfies IEcommerceMallAdmin.ISummary)
          : null,
      } satisfies IEcommerceMallAdminPromotionRequest.ISummary;
    });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
