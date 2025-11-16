import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import { IPageITodoAppTodoadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoadminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminTodoAdminsTodoAdminIdSessions(props: {
  todoAdmin: TodoadminPayload;
  todoAdminId: string;
  body: ITodoAppTodoAdminSession.IRequest;
}): Promise<IPageITodoAppTodoadminSession.ISummary> {
  const requestedAdminId = props.todoAdminId;

  // Pagination parameters with sensible defaults and non-negative clamping
  const rawPage = props.body.page ?? 0;
  const rawLimit = props.body.limit ?? 20;

  const page = rawPage < 0 ? 0 : rawPage;
  const limit = rawLimit <= 0 ? 20 : rawLimit;
  const skip = page * limit;

  // OrderBy allowlist to prevent arbitrary column usage
  const baseOrderMap = {
    created_at: { created_at: "asc" as const },
    expired_at: { expired_at: "asc" as const },
    id: { id: "asc" as const },
  } as const;

  const requestedOrderBy = props.body.orderBy ?? "created_at";
  const baseOrder = Object.prototype.hasOwnProperty.call(
    baseOrderMap,
    requestedOrderBy,
  )
    ? baseOrderMap[requestedOrderBy as keyof typeof baseOrderMap]
    : baseOrderMap.created_at;

  const direction: "asc" | "desc" =
    props.body.orderDirection === "asc" ? "asc" : "desc";

  const orderBy = Object.keys(baseOrder).reduce(
    (acc, key) => {
      return {
        ...acc,
        [key]: direction,
      };
    },
    {} as Record<string, "asc" | "desc">,
  );

  const where = {
    todoAdmin: {
      id: requestedAdminId,
    },
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todoadmin_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        todoAdmin: true,
      },
    }),
    MyGlobal.prisma.todo_app_todoadmin_sessions.count({ where }),
  ]);

  const data: ITodoAppTodoAdminSession.ISummary[] = rows.map((row) => {
    const admin = row.todoAdmin;

    const todoAdminSummary: ITodoAppTodoAdmin.ISummary = {
      id: admin.id,
      email: admin.email,
      display_name:
        admin.display_name === null ? undefined : admin.display_name,
      status: admin.status,
      last_login_at:
        admin.last_login_at === null
          ? undefined
          : toISOStringSafe(admin.last_login_at),
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    };

    const expiredAt =
      row.expired_at === null ? null : toISOStringSafe(row.expired_at);

    const summary: ITodoAppTodoAdminSession.ISummary = {
      id: row.id,
      todoAdmin: todoAdminSummary,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      expired_at: expiredAt,
    };

    return summary;
  });

  const pagination: IPage.IPagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total satisfies number as number,
    pages: (limit === 0
      ? 0
      : Math.ceil(total / limit)) satisfies number as number,
  };

  return {
    pagination,
    data,
  };
}
