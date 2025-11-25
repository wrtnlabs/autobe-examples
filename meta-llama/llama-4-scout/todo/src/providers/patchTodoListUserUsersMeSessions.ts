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

export async function patchTodoListUserUsersMeSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";

  // Safely convert 'from' and 'to' to string (ISO) if present
  const from = props.body.from ? toISOStringSafe(props.body.from) : undefined;
  const to = props.body.to ? toISOStringSafe(props.body.to) : undefined;

  let where: any = {
    todo_list_user_id: props.user.id,
  };
  if (from && to) {
    where.created_at = { gte: from, lte: to };
  } else if (from) {
    where.created_at = { gte: from };
  } else if (to) {
    where.created_at = { lte: to };
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: where,
      orderBy: [
        {
          [orderByField]: orderDirection satisfies "asc" | "desc" as
            | "asc"
            | "desc",
        },
        ...(orderByField !== "created_at"
          ? [{ created_at: "desc" as Prisma.SortOrder }]
          : []),
      ],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: where,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: sessions.map((session) => ({
      id: session.id,
      todo_list_user_id: session.todo_list_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    })),
  };
}
