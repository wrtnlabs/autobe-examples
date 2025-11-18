import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRequest;
}): Promise<IPageITodoListAdmin.ISummary> {
  const {
    email,
    is_locked,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    order = "desc",
  } = props.body ?? {};

  const skip = (page - 1) * limit;
  const where = {
    ...(email && { email: { contains: email } }),
    ...(typeof is_locked === "boolean" ? { is_locked } : {}),
  };
  const orderBy = [{ [sort_by]: order }];

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        is_locked: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      is_locked: admin.is_locked,
      created_at: toISOStringSafe(admin.created_at),
    })),
  };
}
