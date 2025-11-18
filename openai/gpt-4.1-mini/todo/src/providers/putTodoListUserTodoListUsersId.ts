import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListUsersId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListTodoListUser.IUpdate;
}): Promise<ITodoListTodoListUser> {
  if (props.user.id !== props.id) {
    throw new HttpException("Forbidden", 403);
  }

  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.id },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const emailTaken = await MyGlobal.prisma.todo_list_users.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
    if (emailTaken) {
      throw new HttpException("Email already in use", 400);
    }
  }

  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.id },
    data: {
      email: props.body.email ?? existing.email,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
