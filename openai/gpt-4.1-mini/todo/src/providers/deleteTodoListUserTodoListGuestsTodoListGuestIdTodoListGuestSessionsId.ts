import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListGuestsTodoListGuestIdTodoListGuestSessionsId(props: {
  user: UserPayload;
  todoListGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.todo_list_guest_sessions.findUnique({
    where: { id: props.id },
  });

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  if (session.todo_list_guest_id !== props.todoListGuestId) {
    throw new HttpException(
      "Forbidden: session does not belong to the specified guest",
      403,
    );
  }

  await MyGlobal.prisma.todo_list_guest_sessions.delete({
    where: { id: props.id },
  });
}
