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
  const found = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
    },
  });
  if (!found) {
    throw new HttpException("User not found", 404);
  }

  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.id },
    data: {
      email: props.body.email ?? found.email,
      password_hash: props.body.password_hash ?? found.password_hash,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    username: "", // Provide empty string since no DB column
    display_name: "", // Provide empty string since no DB column
    joined_at: toISOStringSafe(updated.created_at),
    is_active: true,
    role: "user",
  };
}
