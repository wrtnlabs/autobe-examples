import { IEAdminGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminGrade";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.isBanned !== undefined && {
      is_banned: props.body.isBanned,
    }),
    ...(props.body.search !== undefined && {
      email: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Regular admins can only view their own account
  whereInput.id = props.admin.id;
  // Build ORDER BY
  const orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput[] =
    [];
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Map sort field to database column (only fields that exist in ecommerce_mall_admins)
  const fieldMapping: Record<
    string,
    keyof Prisma.ecommerce_mall_adminsOrderByWithRelationInput
  > = {
    email: "email",
    createdAt: "created_at",
    updatedAt: "updated_at",
    isActive: "is_banned",
    isBanned: "is_banned",
  };
  const prismaField = fieldMapping[sortField] || "created_at";
  orderByInput.push({ [prismaField]: sortOrder });
  // Execute query
  const data = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminAtSummaryTransformer.transform,
  );
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
