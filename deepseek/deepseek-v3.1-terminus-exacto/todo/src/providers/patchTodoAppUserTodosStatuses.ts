import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { IPageITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoStatus";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodosStatuses(props: {
  user: UserPayload;
  body: ITodoAppTodoStatus.IRequest;
}): Promise<IPageITodoAppTodoStatus.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const where: Prisma.todo_app_todo_statusesWhereInput = {
    ...(props.body.search && {
      OR: [
        { code: { contains: props.body.search, mode: "insensitive" } },
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.code && { code: props.body.code }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.codes && { code: { in: props.body.codes } }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_statuses.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_todo_statuses.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((status) => ({
      id: status.id,
      code: status.code,
      name: status.name,
      is_active: status.is_active,
    })),
  };
}
