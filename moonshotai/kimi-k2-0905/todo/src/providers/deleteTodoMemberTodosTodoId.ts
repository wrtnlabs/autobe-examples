import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the todo exists and the member owns it
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: {
      id: props.todoId,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Check ownership - only the owner can delete their todo
  if (todo.member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to delete this todo",
      403,
    );
  }

  // Perform hard deletion (schema has no soft delete support)
  await MyGlobal.prisma.todo_todos.delete({
    where: { id: props.todoId },
  });
}
