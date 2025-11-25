import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.IRequest;
}): Promise<IPageITodoAppAdmin.ISummary> {
  const defaultLimit = 100;
  const defaultPage = 1;
  const allowedOrderFields = ["created_at", "email"] as const;
  const allowedSort = ["asc", "desc"] as const;

  const page = props.body.page ?? defaultPage;
  const limit = props.body.limit ?? defaultLimit;
  const order_by: "created_at" | "email" = allowedOrderFields.includes(
    (props.body.order_by ?? "") as "created_at" | "email",
  )
    ? (props.body.order_by as "created_at" | "email")
    : "created_at";
  const sort: "asc" | "desc" = allowedSort.includes(
    (props.body.sort ?? "") as "asc" | "desc",
  )
    ? (props.body.sort as "asc" | "desc")
    : "desc";

  const where = {
    deleted_at: null as null,
    ...(props.body.email ? { email: { contains: props.body.email } } : {}),
    ...(props.body.created_at
      ? { created_at: { gte: props.body.created_at } }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admins.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [order_by]: sort },
    }),
    MyGlobal.prisma.todo_app_admins.count({ where }),
  ]);

  const admins: ITodoAppAdmin.ISummary[] = data.map((admin) => ({
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  }));

  return {
    data: admins,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
