import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string;
}): Promise<void> {
  // Verify that the todo exists and belongs to the authenticated member user.
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
    },
  });

  if (existing === null) {
    // Todo either does not exist or does not belong to this user.
    throw new HttpException("Todo not found", 404);
  }

  try {
    await MyGlobal.prisma.todo_app_todos.delete({
      where: {
        id: props.todoId,
      },
    });
  } catch (error) {
    // Handle potential race condition where the record was deleted after the existence check.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Todo not found", 404);
    }
    throw error;
  }
}
