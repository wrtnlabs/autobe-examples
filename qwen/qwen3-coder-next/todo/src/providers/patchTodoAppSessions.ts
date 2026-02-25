import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppSessions(props: {
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.todo_app_user_sessionsWhereInput = {};
  if (props.body.userId !== undefined) {
    where.user = { id: props.body.userId };
  }
  if (props.body.ip !== undefined) {
    where.ip = props.body.ip;
  }
  const created_at: Prisma.DateTimeFilter<"todo_app_user_sessions"> = {};
  if (props.body.startDate !== undefined) {
    created_at.gte = toISOStringSafe(props.body.startDate);
  }
  if (props.body.endDate !== undefined) {
    created_at.lte = toISOStringSafe(props.body.endDate);
  }
  if (Object.keys(created_at).length > 0) {
    where.created_at = created_at;
  }
  if (props.body.expired === "active") {
    where.expired_at = { gt: toISOStringSafe(new Date()) };
  } else if (props.body.expired === "expired") {
    where.expired_at = { lte: toISOStringSafe(new Date()) };
  }
  if (props.body.referrer !== undefined) {
    where.referrer = { contains: props.body.referrer };
  }
  // Build order by clause
  const orderBy: any[] = [];
  if (props.body.sort !== undefined) {
    const direction = props.body.order ?? "desc";
    if (props.body.sort === "createdAt") {
      orderBy.push({ created_at: direction });
    } else if (props.body.sort === "expiredAt") {
      orderBy.push({ expired_at: direction });
    } else if (props.body.sort === "ip") {
      orderBy.push({ ip: direction });
    }
  }
  if (orderBy.length === 0) {
    orderBy.push({ created_at: "desc" });
  }
  // Fetch data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({ where }),
  ]);
  // Transform to response DTO
  const transformed = data.map((session) => {
    return {
      id: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        created_at: toISOStringSafe(session.user.created_at),
      },
      ip: session.ip,
      href: session.href,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    } satisfies ITodoAppUserSession.ISummary;
  });
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageITodoAppUserSession.ISummary;
}
