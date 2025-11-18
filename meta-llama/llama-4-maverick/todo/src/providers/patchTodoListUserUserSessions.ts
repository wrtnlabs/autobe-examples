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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUserSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const { user, body } = props;
  const request = typia.assert<ITodoListUserSession.IRequest>(body);
  const page = request.pagination?.current ?? 1;
  const limit = request.pagination?.limit ?? 100;
  if (page < 1 || limit < 1) {
    throw new HttpException("Invalid pagination parameters", 400);
  }
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.todo_list_user_sessionsWhereInput = {
    ...(request.userId !== undefined &&
      request.userId !== null && { user_id: request.userId }),
    expired_at: null,
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where: whereCondition }),
  ]);
  return {
    data: data.map(
      (session) =>
        ({
          id: session.id,
          user_id: session.user_id,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer,
          created_at: toISOStringSafe(session.created_at),
          expired_at: session.expired_at
            ? toISOStringSafe(session.expired_at)
            : null,
        }) satisfies IPageITodoListUserSession.ISummary["data"][number],
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageITodoListUserSession.ISummary;
}
