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
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      trashed_at: true,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.trashed_at !== null) {
    throw new HttpException("Todo is already in the trash", 409);
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      trashed_at: new Date(),
      updated_at: new Date(),
    },
  });
}
