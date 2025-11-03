import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoId } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction(async (tx) => {
    const del = await tx.todo_todos.deleteMany({
      where: {
        id: todoId,
        todo_user_id: user.id,
      },
    });

    if (del.count === 0) {
      throw new HttpException("Not Found", 404);
    }

    await tx.todo_audit_events.create({
      data: {
        id: v4(),
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        actor_type: "user",
        category: "todo",
        action: "todo_delete",
        success: true,
        message: `Todo deleted: ${todoId}`,
        resource_type: "todo",
        resource_id: todoId,
        created_at: now,
        updated_at: now,
      },
    });
  });
}
