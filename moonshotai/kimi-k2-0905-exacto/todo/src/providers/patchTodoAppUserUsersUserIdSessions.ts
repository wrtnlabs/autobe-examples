import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppSession.IRequest;
}): Promise<IPageITodoAppSession.ISummary> {
  // Authorization check - user can only search their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only search your own sessions", 403);
  }

  const page = Math.max(1, props.body.page.current);
  const limit = Math.max(1, Math.min(100, props.body.page.limit)); // Cap at 100 items per page
  const skip = (page - 1) * limit;

  // Build dynamic where conditions using object spread for cleaner code
  const whereConditions = {
    todo_app_user_id: props.userId,
    ...(props.body.device_type !== undefined && {
      device_type: props.body.device_type,
    }),
    ...(props.body.is_valid !== undefined && {
      is_valid: props.body.is_valid,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.session_type !== undefined && {
      session_type: props.body.session_type,
    }),
    ...((props.body.created_after !== undefined ||
      props.body.created_before !== undefined) && {
      created_at: {
        ...(props.body.created_after !== undefined && {
          gte: props.body.created_after,
        }),
        ...(props.body.created_before !== undefined && {
          lte: props.body.created_before,
        }),
      },
    }),
    ...((props.body.expired_after !== undefined ||
      props.body.expired_before !== undefined) && {
      expired_at: {
        ...(props.body.expired_after !== undefined && {
          gte: props.body.expired_after,
        }),
        ...(props.body.expired_before !== undefined && {
          lte: props.body.expired_before,
        }),
      },
    }),
  };

  // Execute queries in parallel for efficiency
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_app_sessions.count({
      where: whereConditions,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: sessions.map((session) => ({
      id: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        status: session.user.status,
        created_at: toISOStringSafe(session.user.created_at),
      },
      device_type: session.device_type,
      device_name: session.device_name,
      session_type: session.session_type,
      is_valid: session.is_valid,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
