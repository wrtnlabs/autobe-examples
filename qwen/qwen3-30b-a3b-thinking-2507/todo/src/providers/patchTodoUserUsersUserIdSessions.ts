import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sessions = await MyGlobal.prisma.todo_user_sessions.findMany({
    where: {
      user_id: props.userId,
    },
    select: {
      id: true,
      ip: true,
      expired_at: true,
      created_at: true,
      user_id: true,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const sessionUserIds = sessions.map((session) => session.user_id);
  const users = await MyGlobal.prisma.todo_users.findMany({
    where: {
      id: { in: sessionUserIds },
    },
    select: {
      id: true,
      email: true,
    },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));
  const transformedData = sessions.map((session) => {
    const user = userMap.get(session.user_id);
    return {
      id: session.id,
      userId: {
        id: session.user_id,
        name: user?.email || "Unknown",
        email: user?.email || "unknown@example.com",
      },
      deviceInfo: session.ip,
      status: session.expired_at ? "inactive" : "active",
      createdAt: toISOStringSafe(session.created_at),
    };
  });
  const total = await MyGlobal.prisma.todo_user_sessions.count({
    where: {
      user_id: props.userId,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
