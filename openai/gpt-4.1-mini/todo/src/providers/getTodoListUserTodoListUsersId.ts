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

export async function getTodoListUserTodoListUsersId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListTodoListUser> {
  const found = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (found === null) {
    throw new HttpException("TodoListUser not found", 404);
  }

  return {
    id: found.id,
    email: found.email,
    username: "",
    password_hash: found.password_hash,
    display_name: "",
    joined_at: toISOStringSafe(found.created_at),
    last_login_at:
      found.updated_at === null ? undefined : toISOStringSafe(found.updated_at),
    is_active: false,
    role: "user",
  };
}
