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
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (todo.deleted_at === null) {
    throw new HttpException(
      "Permanent delete is only allowed for todos in trash",
      400,
    );
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_todo_histories.deleteMany({
      where: {
        todo_app_todo_id: props.todoId,
      },
    }),
    MyGlobal.prisma.todo_app_todos.delete({
      where: {
        id: props.todoId,
      },
    }),
  ]);
}
