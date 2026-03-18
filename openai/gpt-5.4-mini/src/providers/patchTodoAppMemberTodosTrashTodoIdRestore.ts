import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const restored = await MyGlobal.prisma.$transaction(async (prisma) => {
    const todo = await prisma.todo_app_todos.findUniqueOrThrow({
      where: {
        id: props.todoId,
      },
      select: {
        id: true,
        todo_app_member_id: true,
        deleted_at: true,
      },
    });
    if (todo.todo_app_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (todo.deleted_at === null) {
      throw new HttpException("Only deleted todos can be restored", 400);
    }
    await prisma.todo_app_todos.update({
      where: {
        id: props.todoId,
      },
      data: {
        deleted_at: null,
      },
    });
    return await prisma.todo_app_todos.findUniqueOrThrow({
      where: {
        id: props.todoId,
      },
      ...TodoAppTodoTransformer.select(),
    });
  });
  return await TodoAppTodoTransformer.transform(restored);
}
