import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const body = props.body;
  // Build WHERE conditions
  const where: Prisma.ecommerce_mall_sellersWhereInput = {};
  // Filter by approval status
  if (body.approvalStatus !== null && body.approvalStatus !== undefined) {
    where.approval_status = body.approvalStatus;
  }
  // Filter by email (partial match)
  if (body.email !== null && body.email !== undefined) {
    where.email = { contains: body.email };
  }
  // Filter by created_at date range
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (body.createdAtFrom !== null && body.createdAtFrom !== undefined) {
    createdAtFilter.gte = new Date(body.createdAtFrom);
  }
  if (body.createdAtTo !== null && body.createdAtTo !== undefined) {
    createdAtFilter.lte = new Date(body.createdAtTo);
  }
  if (createdAtFilter.gte !== undefined || createdAtFilter.lte !== undefined) {
    where.created_at = createdAtFilter;
  }
  // Filter by deletion status (default: only non-deleted)
  if (body.includeDeleted !== true) {
    where.deleted_at = null;
  }
  // Calculate pagination
  const limit = body.pageSize ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build ORDER BY
  const sortBy = body.sortBy ?? "createdAt";
  const sortOrder = body.sortOrder ?? "desc";
  const orderByField: "created_at" | "approval_status" | "email" =
    sortBy === "createdAt"
      ? "created_at"
      : sortBy === "approvalStatus"
        ? "approval_status"
        : "email";
  const orderBy: Prisma.ecommerce_mall_sellersOrderByWithRelationInput = {
    [orderByField]: sortOrder,
  };
  // Execute query
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({ where });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    sellers,
    EcommerceMallSellerAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
