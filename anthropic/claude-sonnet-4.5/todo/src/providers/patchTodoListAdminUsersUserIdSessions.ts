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
}): Promise<IPageITodoListUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      todo_list_user_id: props.userId,
    };

    if (props.body.ip) {
      conditions.ip = props.body.ip;
    }

    if (props.body.created_after || props.body.created_before) {
      const createdAtCondition: Record<string, string> = {};
      if (props.body.created_after) {
        createdAtCondition.gte = props.body.created_after;
      }
      if (props.body.created_before) {
        createdAtCondition.lte = props.body.created_before;
      }
      conditions.created_at = createdAtCondition;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
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

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((session) => ({
      id: session.id,
      todo_list_user_id: session.todo_list_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
