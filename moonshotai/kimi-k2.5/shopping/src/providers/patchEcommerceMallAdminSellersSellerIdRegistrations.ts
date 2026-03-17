import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
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

export async function patchEcommerceMallAdminSellersSellerIdRegistrations(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  // Build where conditions
  const where: Prisma.ecommerce_mall_seller_registrationsWhereInput = {
    seller_id: props.sellerId,
  };
  if (props.body.status !== null) {
    where.status = props.body.status;
  }
  if (props.body.reviewerId !== null) {
    where.reviewer_id = props.body.reviewerId;
  }
  // Handle created_at date range
  if (props.body.createdAtFrom !== null || props.body.createdAtTo !== null) {
    where.created_at = {};
    if (props.body.createdAtFrom !== null) {
      where.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== null) {
      where.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Handle reviewed_at date range
  if (props.body.reviewedAtFrom !== null || props.body.reviewedAtTo !== null) {
    where.reviewed_at = {};
    if (props.body.reviewedAtFrom !== null) {
      where.reviewed_at.gte = new Date(props.body.reviewedAtFrom);
    }
    if (props.body.reviewedAtTo !== null) {
      where.reviewed_at.lte = new Date(props.body.reviewedAtTo);
    }
  }
  // Determine sort order
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_seller_registrationsOrderByWithRelationInput =
    sortBy === "createdAt"
      ? { created_at: sortOrder }
      : sortBy === "reviewedAt"
        ? { reviewed_at: sortOrder }
        : sortBy === "updatedAt"
          ? { updated_at: sortOrder }
          : sortBy === "status"
            ? { status: sortOrder }
            : { created_at: sortOrder };
  // Pagination
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Query data and count sequentially
  const registrations =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        reviewed_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
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
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    { where },
  );
  // Transform to DTO
  const data: IEcommerceMallSellerRegistration.ISummary[] = registrations.map(
    (reg) => ({
      id: reg.id,
      status: reg.status,
      rejectionReason: reg.rejection_reason,
      createdAt: toISOStringSafe(reg.created_at),
      updatedAt: toISOStringSafe(reg.updated_at),
      reviewedAt: reg.reviewed_at ? toISOStringSafe(reg.reviewed_at) : null,
      seller: {
        id: reg.seller.id,
        email: reg.seller.email,
        shopName: "",
        approvalStatus: reg.seller.approval_status,
        createdAt: toISOStringSafe(reg.seller.created_at),
        updatedAt: toISOStringSafe(reg.seller.updated_at),
        deletedAt: reg.seller.deleted_at
          ? toISOStringSafe(reg.seller.deleted_at)
          : null,
      } satisfies IEcommerceMallSeller.ISummary,
      reviewer: reg.reviewer
        ? ({
            id: reg.reviewer.id,
            email: reg.reviewer.email,
            grade: reg.reviewer.grade,
            status: reg.reviewer.status,
            nickname: reg.reviewer.nickname,
            createdAt: toISOStringSafe(reg.reviewer.created_at),
          } satisfies IEcommerceMallAdmin.ISummary)
        : null,
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
