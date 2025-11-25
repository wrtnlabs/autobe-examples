import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserAuthUserSessions(props: {
  user: UserPayload;
  body: ITodoListSession.IRequest;
}): Promise<IPageITodoListSession.ISummary> {
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;

  // Build where conditions dynamically
  const whereConditions: Record<string, unknown> = {
    todo_list_user_id: props.user.id,
  };

  // Filter by status if provided
  if (props.body.status !== null && props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereConditions.expired_at = null;
    } else if (props.body.status === "expired") {
      whereConditions.expired_at = { not: null };
    }
  }

  // Search filter: ip_address or user_agent contains
  if (props.body.search) {
    whereConditions.OR = [
      { ip_address: { contains: props.body.search } },
      { user_agent: { contains: props.body.search } },
    ];
  }

  // Build date range conditions
  const createdAtConditions: Record<string, unknown> = {};
  if (props.body.created_after) {
    createdAtConditions.gte = props.body.created_after;
  }
  if (props.body.created_before) {
    createdAtConditions.lte = props.body.created_before;
  }
  if (Object.keys(createdAtConditions).length > 0) {
    whereConditions.created_at = createdAtConditions;
  }

  // Filter by last activity after
  if (props.body.last_activity_after) {
    whereConditions.last_activity_at = {
      gte: props.body.last_activity_after,
    };
  }

  // Determine sort field and order
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderBy = {
    [sortField]: sortOrder,
  } as Record<string, "asc" | "desc">;

  // Execute concurrent queries for data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_sessions.count({
      where: whereConditions,
    }),
  ]);

  // Transform records to API format
  const data = sessions.map((session) => ({
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
    absolute_timeout_at: toISOStringSafe(session.absolute_timeout_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
