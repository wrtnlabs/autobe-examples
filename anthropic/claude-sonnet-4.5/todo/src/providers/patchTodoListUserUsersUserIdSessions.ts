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

export async function patchTodoListUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    todo_list_user_id: props.userId,
  };

  if (props.body.ip) {
    whereCondition.ip = props.body.ip;
  }

  if (props.body.created_after || props.body.created_before) {
    const createdAtCondition: Record<string, unknown> = {};
    if (props.body.created_after) {
      createdAtCondition.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before) {
      createdAtCondition.lte = new Date(props.body.created_before);
    }
    whereCondition.created_at = createdAtCondition;
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: whereCondition,
    }),
  ]);

  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: sessions.map((session) => {
      const summary: ITodoListUserSession.ISummary = {
        id: session.id,
        todo_list_user_id: session.todo_list_user_id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(session.created_at),
        expired_at: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
      };
      return summary;
    }),
  };
}
