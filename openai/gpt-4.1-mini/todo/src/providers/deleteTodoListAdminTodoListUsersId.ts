import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminTodoListUsersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  await MyGlobal.prisma.todo_list_users.delete({ where: { id: props.id } });
}
