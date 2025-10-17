import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function deleteTodoListTodoMemberTodosTodoId(props: {
  todoMember: TodomemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoMember, todoId } = props;

  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      todo_list_todo_member_id: todoMember.id,
    },
    select: { id: true },
  });

  if (existing === null) {
    throw new HttpException("Not Found", 404);
  }

  try {
    await MyGlobal.prisma.todo_list_todos.delete({
      where: { id: todoId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Not Found", 404);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
