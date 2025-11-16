import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserAuthUsersUserIdActivity(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Security check: user can only access their own activity
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own activity",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const conditions: Prisma.todo_app_user_sessionsWhereInput = {
    user_id: props.userId, // Security: only user's own sessions
  };

  // Apply date range filters if provided
  if (props.body.created_at_start || props.body.created_at_end) {
    conditions.created_at = {};
    if (props.body.created_at_start) {
      conditions.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      conditions.created_at.lte = props.body.created_at_end;
    }
  }

  // Apply expiration status filter if provided
  if (props.body.expired_at !== undefined && props.body.expired_at !== null) {
    if (props.body.expired_at === true) {
      conditions.expired_at = { not: null };
    } else if (props.body.expired_at === false) {
      conditions.expired_at = null;
    }
  }

  // Execute queries concurrently for better performance
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: conditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({ where: conditions }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      user_id: session.user_id,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
