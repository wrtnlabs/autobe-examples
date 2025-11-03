import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import { IPageIShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingAdmin.IRequest;
}): Promise<IPageIShoppingAdmin.ISummary> {
  const { body } = props;
  const page = Number(body.page);
  const limit = Number(body.limit);
  const offset = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.role !== undefined && { role: body.role }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        OR: [
          { email: { contains: body.search } },
          { name: { contains: body.search } },
          { role: { contains: body.search } },
        ],
      }),
  };

  const allowedSortFields = [
    "id",
    "email",
    "name",
    "role",
    "status",
    "created_at",
  ];
  const orderByField = allowedSortFields.includes(body.order_by ?? "")
    ? body.order_by!
    : "created_at";
  const orderDirection =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_admins.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: offset,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
    })),
  };
}
