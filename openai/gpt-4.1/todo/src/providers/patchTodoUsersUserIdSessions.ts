import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoUsersUserIdSessions(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  const filters: Record<string, unknown> = {
    todo_user_id: props.userId,
  };

  if (props.body.created_from) {
    filters.created_at = {
      ...(filters.created_at as object),
      gte: props.body.created_from,
    };
  }

  if (props.body.created_to) {
    filters.created_at = {
      ...(filters.created_at as object),
      ...(filters.created_from ? { gte: props.body.created_from } : {}),
      lt: props.body.created_to,
    };
  }

  if (props.body.expired === true) {
    filters.expired_at = { not: null };
  } else if (props.body.expired === false) {
    filters.expired_at = null;
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_user_sessions.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_user_sessions.count({
      where: filters,
    }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    todo_user_id: session.todo_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
