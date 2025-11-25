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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession> {
  // Only the user themselves (props.user.id === props.userId) or an admin (never, per context—only user context permitted)
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own session records.",
      403,
    );
  }
  // Pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Query filter
  const where: Record<string, any> = {
    todo_list_user_id: props.userId,
  };
  // Text search (ip, href, referrer)
  if (props.body.search) {
    where.OR = [
      { ip: { contains: props.body.search, mode: "insensitive" } },
      { href: { contains: props.body.search, mode: "insensitive" } },
      { referrer: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Date filters
  if (props.body.from || props.body.to) {
    where.created_at = {};
    if (props.body.from) {
      where.created_at.gte = props.body.from;
    }
    if (props.body.to) {
      where.created_at.lte = props.body.to;
    }
  }
  // Status filter
  if (props.body.status === "active") {
    where.expired_at = null;
  } else if (props.body.status === "expired") {
    where.expired_at = { not: null };
  }
  // Query sessions and total count concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((session: any) => ({
      id: session.id,
      todo_list_user_id: session.todo_list_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
