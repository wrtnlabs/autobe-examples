import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTrashItemTransformer } from "../transformers/TodoAppTodoTrashItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTrashTodoIdAudit(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<ITodoAppTodoTrashItem> {
  // Validate todoId is a valid UUID
  typia.assert<typeof props.todoId>(props.todoId);
  // Query trash entry with ownership validation
  const trashEntry =
    await MyGlobal.prisma.todo_app_todo_trash_entries.findFirst({
      where: {
        todo_app_todo_id: props.todoId,
        member: { id: props.member.id },
      },
      ...TodoAppTodoTrashItemTransformer.select(),
    });
  if (trashEntry === null) {
    // Determine error type: not in trash vs. ownership violation
    const todoExists = await MyGlobal.prisma.todo_app_todos.findFirst({
      where: {
        id: props.todoId,
        todo_app_member_id: props.member.id,
      },
      select: { id: true },
    });
    if (todoExists === null) {
      throw new HttpException("Todo not found or access denied", 403);
    } else {
      throw new HttpException("Todo not found in trash", 404);
    }
  }
  return await TodoAppTodoTrashItemTransformer.transform(trashEntry);
}
