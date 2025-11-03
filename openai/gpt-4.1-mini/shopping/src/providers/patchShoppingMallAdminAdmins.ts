import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
    ...(body.filter?.email !== undefined &&
      body.filter.email !== null && {
        email: { contains: body.filter.email },
      }),
    ...(body.filter?.full_name !== undefined &&
      body.filter.full_name !== null && {
        full_name: { contains: body.filter.full_name },
      }),
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.OR = [
      { email: { contains: body.search } },
      { full_name: { contains: body.search } },
    ];
  }

  const validSortFields = ["email", "full_name", "created_at"];
  const sortField =
    body.sort?.field && validSortFields.includes(body.sort.field)
      ? body.sort.field
      : "created_at";
  const sortOrder = body.sort?.order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((admin) => ({
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at
        ? toISOStringSafe(admin.deleted_at)
        : undefined,
    })),
  };
}
