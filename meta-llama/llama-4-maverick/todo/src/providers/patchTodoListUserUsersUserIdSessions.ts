import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string;
}): Promise<IPageITodoListUserSession> {
  if (!typia.is<string & tags.Format<"uuid">>(props.userId)) {
    throw new HttpException("Invalid user ID format", 400);
  }
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const sessions = await MyGlobal.prisma.todo_list_user_sessions.findMany({
    where: { user_id: props.userId },
  });
  const sessionIds = sessions.map((session) => session.id);
  return {
    data: sessionIds satisfies ITodoListUserSession[],
    pagination: {
      current: 1,
      limit: sessionIds.length,
      records: sessionIds.length,
      pages: 1,
    },
  } satisfies IPageITodoListUserSession;
}
