import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogout";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserAuthUserLogout(props: {
  user: UserPayload;
}): Promise<ITodoListLogout.IResponse> {
  const { user } = props;

  // Find the user's active refresh token (not yet revoked)
  const activeToken = await MyGlobal.prisma.todo_list_refresh_tokens.findFirst({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // If an active token exists, revoke it
  if (activeToken) {
    await MyGlobal.prisma.todo_list_refresh_tokens.update({
      where: {
        id: activeToken.id,
      },
      data: {
        revoked_at: toISOStringSafe(new Date()),
      },
    });
  }

  return {
    message: "Successfully logged out",
  };
}
