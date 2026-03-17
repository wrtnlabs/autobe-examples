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

export async function patchEcommerceMallAdminSellerRegistrations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const { body } = props;
  // Build where clause from filters
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
  // Determine order by - map DTO sort fields to Prisma column names
  const sortField = body.sortBy ?? "createdAt";
  const sortDirection = body.sortOrder ?? "desc";
  const getOrderBy =
    (): Prisma.ecommerce_mall_seller_registrationsOrderByWithRelationInput => {
      switch (sortField) {
        case "createdAt":
          return { created_at: sortDirection };
        case "reviewedAt":
          return { reviewed_at: sortDirection };
        case "updatedAt":
          return { updated_at: sortDirection };
        case "status":
          return { status: sortDirection };
        default:
          return { created_at: sortDirection };
      }
    };
  const orderBy = getOrderBy();
  // Pagination parameters
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  // Build query options based on pagination mode
  const findManyArgs: Prisma.ecommerce_mall_seller_registrationsFindManyArgs = {
    where,
    orderBy,
    take: limit,
  };
  if (body.cursor !== null) {
    // Cursor-based pagination
    findManyArgs.cursor = { id: body.cursor };
    findManyArgs.skip = 1;
  } else {
    // Offset-based pagination
    findManyArgs.skip = (page - 1) * limit;
  }
  // Execute count and find queries
  const totalRecords =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.count({
      where,
    });
  const registrations =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      ...findManyArgs,
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    registrations,
    EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const currentPage = body.cursor !== null ? page : page;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
  return {
    data,
    pagination: {
      current: currentPage,
      limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
