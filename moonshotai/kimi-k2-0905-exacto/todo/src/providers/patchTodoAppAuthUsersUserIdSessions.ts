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
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function patchTodoAppAuthUsersUserIdSessions(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build dynamic where conditions
  const whereConditions: Record<string, unknown> = {
    user_id: props.userId,
  };

  // Add date range filtering if provided
  if (props.body.created_at_start || props.body.created_at_end) {
    whereConditions.created_at = {} as Prisma.DateTimeFilter;
    if (props.body.created_at_start) {
      (whereConditions.created_at as Prisma.DateTimeFilter).gte = new Date(
        props.body.created_at_start,
      );
    }
    if (props.body.created_at_end) {
      (whereConditions.created_at as Prisma.DateTimeFilter).lte = new Date(
        props.body.created_at_end,
      );
    }
  }

  // Add expired_at filtering if provided
  if (props.body.expired_at !== undefined) {
    if (props.body.expired_at === null) {
      whereConditions.expired_at = null;
    } else {
      whereConditions.expired_at = props.body.expired_at ? { not: null } : null;
    }
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      user_id: session.user_id,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      ip: session.ip,
      href: session.href as string & tags.Format<"uri">,
      referrer: session.referrer as string & tags.Format<"uri">,
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
