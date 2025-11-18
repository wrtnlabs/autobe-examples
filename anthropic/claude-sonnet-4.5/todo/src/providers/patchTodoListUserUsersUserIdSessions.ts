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
  // Authorization: Users can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition for date range
  const createdAtCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_after) {
    createdAtCondition.gte = new Date(props.body.created_after);
  }
  if (props.body.created_before) {
    createdAtCondition.lte = new Date(props.body.created_before);
  }

  // Build complete where condition
  const whereCondition: Prisma.todo_list_user_sessionsWhereInput = {
    user_id: props.userId,
    ...(props.body.ip && { ip: props.body.ip }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
    ...(props.body.is_active !== null &&
      props.body.is_active !== undefined && {
        expired_at: props.body.is_active ? null : { not: null },
      }),
  };

  // Build orderBy from sort parameter
  const orderBy: Prisma.todo_list_user_sessionsOrderByWithRelationInput[] = [];
  if (props.body.sort && props.body.sort.length > 0) {
    for (const sortItem of props.body.sort) {
      const direction = sortItem.startsWith("+") ? "asc" : "desc";
      const field = sortItem.substring(1) as "created_at" | "expired_at" | "ip";
      orderBy.push({ [field]: direction });
    }
  } else {
    orderBy.push({ created_at: "desc" });
  }

  // Execute queries concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: whereCondition,
    }),
  ]);

  // Map to response format
  const data: ITodoListUserSession.ISummary[] = sessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    ip: session.ip,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
