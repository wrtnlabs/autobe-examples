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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admins.findMany({
      where: {
        deleted_at: null,
        ...(props.body.email && {
          email: {
            contains: props.body.email,
            mode: "insensitive",
          },
        }),
        ...(props.body.search &&
          !props.body.email && {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          }),
      },
      skip: skip,
      take: limit,
      orderBy: {
        created_at: props.body.sort === "created_at" ? "asc" : "desc",
      },
    }),
    MyGlobal.prisma.todo_list_admins.count({
      where: {
        deleted_at: null,
        ...(props.body.email && {
          email: {
            contains: props.body.email,
            mode: "insensitive",
          },
        }),
        ...(props.body.search &&
          !props.body.email && {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          }),
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data.map((admin) => ({
      id: admin.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    })),
  };
}
