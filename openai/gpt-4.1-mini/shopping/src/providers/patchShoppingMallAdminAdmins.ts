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

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null
      ? { email: { contains: body.search } }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
  };

  const validOrderFields = new Set([
    "email",
    "status",
    "full_name",
    "created_at",
    "updated_at",
  ]);
  const orderByField =
    body.orderBy && validOrderFields.has(body.orderBy)
      ? body.orderBy
      : "created_at";
  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);

  const data: IShoppingMallAdmin.ISummary[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name ?? undefined,
    status: r.status,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

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
