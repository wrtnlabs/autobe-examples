import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  const { user, userId, body } = props;

  // Authorization: only owner may update their profile
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Ensure user exists
  const existing = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { id: userId },
  });
  if (existing === null) {
    throw new HttpException("Not Found", 404);
  }

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Perform update - inline data object to preserve clear type errors
  const updated = await MyGlobal.prisma.todo_app_user.update({
    where: { id: userId },
    data: {
      display_name:
        body.display_name === undefined ? undefined : body.display_name,
      updated_at: now,
    },
  });

  // Map Prisma result to API DTO, converting Date -> ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    display_name: updated.display_name ?? undefined,
    account_status: updated.account_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    last_active_at: updated.last_active_at
      ? toISOStringSafe(updated.last_active_at)
      : null,
  };
}
