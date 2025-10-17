import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoListRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListRefreshToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListRefreshToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserAuthUserSessions(props: {
  user: UserPayload;
}): Promise<IPageITodoListRefreshToken> {
  const { user } = props;

  const currentTime = new Date();
  const pageSize = 100;

  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.todo_list_refresh_tokens.findMany({
      where: {
        todo_list_user_id: user.id,
        revoked_at: null,
        expires_at: { gte: currentTime },
      },
      orderBy: { created_at: "desc" },
      take: pageSize,
    }),
    MyGlobal.prisma.todo_list_refresh_tokens.count({
      where: {
        todo_list_user_id: user.id,
        revoked_at: null,
        expires_at: { gte: currentTime },
      },
    }),
  ]);

  const data: ITodoListRefreshToken[] = tokens.map((token) => ({
    id: token.id,
    expires_at: toISOStringSafe(token.expires_at),
    created_at: toISOStringSafe(token.created_at),
    revoked_at: token.revoked_at
      ? toISOStringSafe(token.revoked_at)
      : undefined,
  }));

  return {
    pagination: {
      current: Number(1),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(Math.ceil(total / pageSize)),
    },
    data,
  };
}
