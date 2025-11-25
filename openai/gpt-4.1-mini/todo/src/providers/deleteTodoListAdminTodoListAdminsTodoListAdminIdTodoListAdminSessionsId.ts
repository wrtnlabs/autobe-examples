import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminTodoListAdminsTodoListAdminIdTodoListAdminSessionsId(props: {
  admin: AdminPayload;
  todoListAdminId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: { id: props.id },
  });

  if (!session) {
    throw new HttpException("Admin session not found", 404);
  }

  if (session.todo_list_admin_id !== props.todoListAdminId) {
    throw new HttpException("Forbidden to delete this session", 403);
  }

  await MyGlobal.prisma.todo_list_admin_sessions.delete({
    where: { id: props.id },
  });
}
