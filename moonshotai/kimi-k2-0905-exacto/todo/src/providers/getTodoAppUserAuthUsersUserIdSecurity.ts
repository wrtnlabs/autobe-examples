import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserAuthUsersUserIdSecurity(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Check authorization - users can only view their own session security data
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - can only access your own session security data",
      403,
    );
  }

  // Query sessions for the specified user with pagination
  const page = 1; // Default page
  const limit = 50; // Default limit for security data
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: {
        user_id: props.userId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where: {
        user_id: props.userId,
      },
    }),
  ]);

  // Transform to API response format
  return {
    data: sessions.map((session) => ({
      id: session.id,
      user_id: session.user_id,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
