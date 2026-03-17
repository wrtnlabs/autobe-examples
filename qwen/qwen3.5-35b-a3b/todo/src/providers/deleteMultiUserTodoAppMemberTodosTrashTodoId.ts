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

export async function deleteMultiUserTodoAppMemberTodosTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.multi_user_todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      deleted_at: {
        not: null,
      },
    },
    select: {
      user_id: true,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.deleteMany({
      where: {
        todo_id: props.todoId,
      },
    }),
    MyGlobal.prisma.multi_user_todo_app_todos.delete({
      where: {
        id: props.todoId,
      },
    }),
  ]);
}
