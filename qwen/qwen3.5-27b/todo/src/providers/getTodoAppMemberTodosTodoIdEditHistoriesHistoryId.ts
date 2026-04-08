import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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
  // Verify the todo exists and belongs to the authenticated member
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: { id: true },
  });
  // Query the edit history entry with ownership verification
  const record =
    await MyGlobal.prisma.todo_app_todo_edit_histories.findFirstOrThrow({
      ...TodoAppTodoEditHistoryTransformer.select(),
      where: {
        id: props.historyId,
        todo_app_todos_id: props.todoId,
      },
    });
  return await TodoAppTodoEditHistoryTransformer.transform(record);
}
