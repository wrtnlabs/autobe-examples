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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession> {
  // Check if user exists and is not soft-deleted
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId, deleted_at: null },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Extract/search params
  const {
    page = 1,
    limit = 30,
    sort_by = "created_at",
    sort_order = "desc",
    ip,
  } = props.body ?? {};
  const skip = (Number(page) - 1) * Number(limit);

  // Build where
  const where = {
    user_id: props.userId,
    ...(ip && { ip }),
  };
  const orderBy =
    sort_by === "expired_at"
      ? { expired_at: sort_order }
      : { created_at: sort_order };

  // Query data and count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    user_id: session.user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : session.expired_at,
  }));

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
}
