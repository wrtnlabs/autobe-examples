import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const {
    email,
    name,
    status,
    is_email_verified,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  const where: Record<string, unknown> = {};

  if (email !== undefined) {
    where.email = { contains: email, mode: "insensitive" };
  }
  if (name !== undefined) {
    where.name = { contains: name, mode: "insensitive" };
  }
  if (status !== undefined) {
    const statuses = status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }
  if (is_email_verified !== undefined) {
    where.is_email_verified = is_email_verified;
  }

  if (created_from !== undefined || created_to !== undefined) {
    const createdAtFilter: Record<string, unknown> = {};
    if (created_from !== undefined) {
      createdAtFilter.gte = toISOStringSafe(created_from);
    }
    if (created_to !== undefined) {
      createdAtFilter.lte = toISOStringSafe(created_to);
    }
    if (Object.keys(createdAtFilter).length > 0) {
      where.created_at = createdAtFilter;
    }
  }
  if (updated_from !== undefined || updated_to !== undefined) {
    const updatedAtFilter: Record<string, unknown> = {};
    if (updated_from !== undefined) {
      updatedAtFilter.gte = toISOStringSafe(updated_from);
    }
    if (updated_to !== undefined) {
      updatedAtFilter.lte = toISOStringSafe(updated_to);
    }
    if (Object.keys(updatedAtFilter).length > 0) {
      where.updated_at = updatedAtFilter;
    }
  }

  const pageNumber = Number(page) || 1;
  const pageLimit = Number(limit) || 20;
  const offset = (pageNumber - 1) * pageLimit;

  const orderableFields = [
    "created_at",
    "updated_at",
    "email",
    "name",
    "status",
  ] as const;
  let finalSortBy = orderableFields.includes(
    (sort_by ?? "") as (typeof orderableFields)[number],
  )
    ? (sort_by as (typeof orderableFields)[number])
    : "created_at";
  let finalSortOrder =
    sort_order === "asc" || sort_order === "desc" ? sort_order : "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      skip: offset,
      take: pageLimit,
      orderBy: [{ [finalSortBy as string]: finalSortOrder }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: records.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    })),
  };
}
