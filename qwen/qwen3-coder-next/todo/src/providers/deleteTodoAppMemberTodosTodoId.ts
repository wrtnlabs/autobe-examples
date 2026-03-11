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

export async function deleteTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.member.id,
    },
    select: {
      id: true,
      is_trashed: true,
      updated_at: true,
    },
  });
  if (todo.is_trashed) {
    await MyGlobal.prisma.todo_app_todos.delete({
      where: { id: props.todoId },
    });
  } else {
    await MyGlobal.prisma.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        is_trashed: true,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  }
}
