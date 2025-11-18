import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersMe(props: {
  user: UserPayload;
}): Promise<void> {
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_user_sessions.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    MyGlobal.prisma.todo_list_todos.deleteMany({
      where: { user_id: props.user.id },
    }),
    MyGlobal.prisma.todo_list_users.delete({
      where: { id: props.user.id },
    }),
  ]);
}
