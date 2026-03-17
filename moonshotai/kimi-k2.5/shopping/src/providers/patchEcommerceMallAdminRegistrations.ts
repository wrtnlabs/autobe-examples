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
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRegistrations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const { body } = props;
  const limit = body.limit;
  // Build where clause from filter criteria
  const where: Prisma.ecommerce_mall_seller_registrationsWhereInput = {};
  if (body.status !== null) {
    where.status = body.status;
  }
  if (body.sellerId !== null) {
    where.seller_id = body.sellerId;
  }
  if (body.reviewerId !== null) {
    where.reviewer_id = body.reviewerId;
  }
  if (body.createdAtFrom !== null || body.createdAtTo !== null) {
    where.created_at = {};
    if (body.createdAtFrom !== null) {
      where.created_at.gte = new Date(body.createdAtFrom);
    }
    if (body.createdAtTo !== null) {
      where.created_at.lte = new Date(body.createdAtTo);
    }
  }
  if (body.reviewedAtFrom !== null || body.reviewedAtTo !== null) {
    where.reviewed_at = {};
    if (body.reviewedAtFrom !== null) {
      where.reviewed_at.gte = new Date(body.reviewedAtFrom);
    }
    if (body.reviewedAtTo !== null) {
      where.reviewed_at.lte = new Date(body.reviewedAtTo);
    }
  }
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_seller_registrationsOrderByWithRelationInput =
    body.sortBy === "reviewedAt"
      ? { reviewed_at: body.sortOrder ?? "desc" }
      : body.sortBy === "updatedAt"
        ? { updated_at: body.sortOrder ?? "desc" }
        : body.sortBy === "status"
          ? { status: body.sortOrder ?? "desc" }
          : { created_at: body.sortOrder ?? "desc" };
  // Determine pagination strategy
  const page = body.page ?? 1;
  // Execute query with appropriate pagination
  const registrations =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where,
      orderBy,
      skip: body.cursor !== null ? 1 : (page - 1) * limit,
      take: limit + 1,
      cursor: body.cursor !== null ? { id: body.cursor } : undefined,
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  // Determine if there's more data
  const hasMore = registrations.length > limit;
  const dataRecords = hasMore ? registrations.slice(0, limit) : registrations;
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    { where },
  );
  // Transform records to DTOs
  const data = await ArrayUtil.asyncMap(
    dataRecords as Parameters<
      typeof EcommerceMallSellerRegistrationAtSummaryTransformer.transform
    >[0][],
    EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: body.cursor !== null ? 1 : page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  };
}
