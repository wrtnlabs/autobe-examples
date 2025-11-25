import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodoListAdminsTodoListAdminIdTodoListAdminSessions(props: {
  admin: AdminPayload;
  todoListAdminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IRequest;
}): Promise<IPageITodoListAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    todo_list_admin_id: props.todoListAdminId,
    ...(props.body.expired === undefined
      ? {}
      : props.body.expired
        ? { expired_at: { not: null } }
        : { expired_at: null }),
  };

  const orderByCondition = props.body.sort_by
    ? {
        [props.body.sort_by]:
          "desc" satisfies Prisma.SortOrder as Prisma.SortOrder,
      }
    : { created_at: "desc" satisfies Prisma.SortOrder as Prisma.SortOrder };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where: whereCondition,
      skip: skip satisfies number as number,
      take: limit satisfies number as number,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({ where: whereCondition }),
  ]);

  const mappedData = data.map((session) => ({
    id: session.id,
    todo_list_admin_id: session.todo_list_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  }));

  return {
    data: mappedData,
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
