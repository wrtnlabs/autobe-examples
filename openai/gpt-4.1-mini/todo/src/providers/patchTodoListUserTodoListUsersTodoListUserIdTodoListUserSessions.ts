import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListUsersTodoListUserIdTodoListUserSessions(props: {
  user: UserPayload;
  todoListUserId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build search filter condition
  const search = props.body.search?.trim();

  const where = {
    todo_list_user_id: props.todoListUserId,
    ...(search
      ? {
          OR: [
            {
              ip: {
                contains: search,
                mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
              },
            },
            {
              href: {
                contains: search,
                mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
              },
            },
            {
              referrer: {
                contains: search,
                mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
              },
            },
          ],
        }
      : {}),
  };

  // Validate sortBy and sortOrder
  const validSortFields = new Set([
    "created_at",
    "expired_at",
    "ip",
    "href",
    "referrer",
  ]);
  const sortBy =
    props.body.sortBy && validSortFields.has(props.body.sortBy)
      ? props.body.sortBy
      : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  // Query database in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  // Map DB result to API summary
  const summaries = data.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    todo_list_user_id: session.todo_list_user_id as string &
      tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  }));

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
