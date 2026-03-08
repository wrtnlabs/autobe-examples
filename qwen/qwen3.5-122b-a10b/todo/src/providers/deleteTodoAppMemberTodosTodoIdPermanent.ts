import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppMemberTodosTodoIdPermanent(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify todo exists and belongs to authenticated member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      deleted_at: true,
    },
  } satisfies Prisma.todo_app_todosFindUniqueArgs);
  // Step 2: Verify ownership
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify todo is in trash (deleted_at is not null)
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  // Step 4: Atomically delete history entries and todo
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all associated history entries
    await tx.todo_app_todo_histories.deleteMany({
      where: { todo_app_todos_id: props.todoId },
    });
    // Delete the todo
    await tx.todo_app_todos.delete({
      where: { id: props.todoId },
    });
  });
}
