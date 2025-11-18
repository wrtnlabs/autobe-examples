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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  // Verify user can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  // Set pagination defaults with proper typing
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;

  // Build where condition for filtering
  const whereCondition: Record<string, unknown> = {
    todo_list_user_id: props.userId,
  };

  // IP address filtering
  if (props.body.ip !== undefined) {
    whereCondition.ip = { contains: props.body.ip };
  }

  // Date range filtering - handle ISO strings directly
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereCondition.created_at = {};
    if (props.body.created_at_start !== undefined) {
      (whereCondition.created_at as Record<string, unknown>).gte =
        props.body.created_at_start;
    }
    if (props.body.created_at_end !== undefined) {
      (whereCondition.created_at as Record<string, unknown>).lte =
        props.body.created_at_end;
    }
  }

  // Expiration status filtering
  if (props.body.expired !== undefined) {
    if (props.body.expired) {
      whereCondition.expired_at = { not: null };
    } else {
      whereCondition.expired_at = null;
    }
  }

  // Build orderBy condition
  const orderByCondition: Record<string, unknown> = {};
  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  orderByCondition[orderByField] = orderDirection;

  // Execute paginated query
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: whereCondition,
    }),
  ]);

  // Map results to DTO with proper type handling
  const data = sessions.map((session) => ({
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      status: session.user.status,
      created_at: toISOStringSafe(session.user.created_at),
      updated_at: toISOStringSafe(session.user.updated_at),
      deleted_at: session.user.deleted_at
        ? toISOStringSafe(session.user.deleted_at)
        : undefined,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
