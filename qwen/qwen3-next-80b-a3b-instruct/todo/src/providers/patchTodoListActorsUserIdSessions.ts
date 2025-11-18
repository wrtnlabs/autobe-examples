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

export async function patchTodoListActorsUserIdSessions(props: {
  userId: string;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build search criteria with active session filter (expired_at IS NULL)
  const where: Record<string, any> = {
    todo_list_user_id: props.userId,
    expired_at: null,
  };

  // Add optional date filters on created_at (schema field)
  if (props.body.created_date_start || props.body.created_date_end) {
    where.created_at = {};
    if (props.body.created_date_start) {
      where.created_at.gte = props.body.created_date_start;
    }
    if (props.body.created_date_end) {
      where.created_at.lte = props.body.created_date_end;
    }
  }

  // Filter by IP address (schema field is 'ip')
  if (props.body.ip_address) {
    where.ip = { contains: props.body.ip_address };
  }

  // Determine sort field and order - use valid schema fields (created_at)
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.sort_by === "creation_date") {
    orderBy.created_at = props.body.sort_order === "desc" ? "desc" : "asc";
  } else if (props.body.sort_by === "device_info") {
    // device_info doesn't exist in schema - use created_at as fallback
    orderBy.created_at = props.body.sort_order === "desc" ? "desc" : "asc";
  } else {
    orderBy.created_at = "desc"; // default
  }

  // Fetch session data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: { id: true },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((session) => session.id),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
