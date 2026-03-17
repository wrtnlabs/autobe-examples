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

export async function deleteMultiUserTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo =
    await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
      where: {
        id: props.todoId,
        user_id: props.member.id,
      },
    });
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo is already deleted", 409);
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.multi_user_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
