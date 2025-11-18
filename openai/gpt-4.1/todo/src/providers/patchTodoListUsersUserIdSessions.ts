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

export async function patchTodoListUsersUserIdSessions(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const {
    created_at_gte,
    created_at_lte,
    expired_only,
    ip_contains,
    user_agent_contains,
    page,
    limit,
    order_by,
    order_direction,
  } = props.body;

  // Pagination defaults
  const pageIndex = page ?? 1;
  const pageLimit = limit ?? 100;
  const skip = (pageIndex - 1) * pageLimit;

  // Build created_at filter
  let createdAtFilter: { gte?: string; lte?: string } = {};
  if (created_at_gte !== undefined) {
    createdAtFilter.gte = created_at_gte;
  }
  if (created_at_lte !== undefined) {
    createdAtFilter.lte = created_at_lte;
  }

  // Build where conditions
  const where: Record<string, unknown> = {
    todo_list_user_id: props.userId,
    ...(createdAtFilter.gte !== undefined || createdAtFilter.lte !== undefined
      ? {
          created_at: { ...createdAtFilter },
        }
      : {}),
    ...(typeof expired_only === "boolean"
      ? expired_only
        ? { expired_at: { not: null } }
        : { expired_at: null }
      : {}),
    ...(ip_contains ? { ip: { contains: ip_contains } } : {}),
    ...(user_agent_contains
      ? { user_agent: { contains: user_agent_contains } }
      : {}),
  };

  // Determine orderBy
  const sortField: "created_at" | "expired_at" = order_by ?? "created_at";
  const sortDirection: "asc" | "desc" = order_direction ?? "desc";
  const orderBy = { [sortField]: sortDirection };

  // Query DB
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy,
      skip,
      take: pageLimit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  }));

  return {
    pagination: {
      current: pageIndex,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data,
  };
}
