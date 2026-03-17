import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryTransformer } from "../transformers/TodoAppTodoEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdEditHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoEditHistory> {
  // Step 1: Verify the parent todo exists and is owned by the authenticated member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Not found", 404);
  }
  // Step 2: Look up the edit history entry scoped to this todo
  const history =
    await MyGlobal.prisma.todo_app_todo_edit_histories.findFirstOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId,
      },
      ...TodoAppTodoEditHistoryTransformer.select(),
    });
  // Step 3: Transform and return
  return TodoAppTodoEditHistoryTransformer.transform(history);
}
