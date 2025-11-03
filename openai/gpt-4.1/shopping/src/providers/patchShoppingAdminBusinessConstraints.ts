import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";
import { IPageIShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingBusinessConstraint";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminBusinessConstraints(props: {
  admin: AdminPayload;
  body: IShoppingBusinessConstraint.IRequest;
}): Promise<IPageIShoppingBusinessConstraint.ISummary> {
  const { body } = props;
  // Handle pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Build where condition
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.scope !== undefined &&
      body.scope !== null && { scope: body.scope }),
    ...(body.constraint_name !== undefined &&
      body.constraint_name !== null && {
        constraint_name: body.constraint_name,
      }),
    ...(body.active !== undefined &&
      body.active !== null && { active: body.active }),
  };
  // Allowed sort fields
  const allowedSortFields = [
    "created_at",
    "constraint_name",
    "scope",
    "active",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";
  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_business_constraints.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        constraint_name: true,
        scope: true,
        limit_value: true,
        unit: true,
        description: true,
        active: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_business_constraints.count({ where }),
  ]);
  // Map to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    constraint_name: row.constraint_name,
    scope: row.scope,
    limit_value: row.limit_value,
    unit: row.unit,
    description: row.description ?? undefined,
    active: row.active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  // Prepare pagination info
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
