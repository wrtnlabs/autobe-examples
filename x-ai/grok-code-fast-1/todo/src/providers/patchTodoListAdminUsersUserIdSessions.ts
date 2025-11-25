import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // (1) Verify user exists
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // (2) Build filter condition
  const body = props.body;
  let where: Record<string, unknown> = {
    todo_list_user_id: props.userId,
  };

  if (body.search) {
    where = {
      ...where,
      OR: [
        { ip: { contains: body.search, mode: "insensitive" } },
        { href: { contains: body.search, mode: "insensitive" } },
        { referrer: { contains: body.search, mode: "insensitive" } },
      ],
    };
  }

  if (body.from || body.to) {
    where = {
      ...where,
      created_at: {
        ...(body.from ? { gte: body.from } : {}),
        ...(body.to ? { lte: body.to } : {}),
      },
    };
  }

  if (body.status === "active") {
    where = { ...where, expired_at: null };
  }
  if (body.status === "expired") {
    where = { ...where, NOT: { expired_at: null } };
  }

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // (3) Query sessions and count concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  // (4) Map results strictly to DTO (dates must be string, check null handling)
  const data = sessions.map((session) => ({
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at:
      typeof session.created_at === "string"
        ? session.created_at
        : toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at == null
        ? undefined
        : typeof session.expired_at === "string"
          ? session.expired_at
          : toISOStringSafe(session.expired_at),
  }));

  // (5) Return with proper pagination metadata
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
