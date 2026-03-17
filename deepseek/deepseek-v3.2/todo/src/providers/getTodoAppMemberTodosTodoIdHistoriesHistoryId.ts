import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryTransformer } from "../transformers/TodoAppTodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string;
  historyId: string;
}): Promise<ITodoAppTodoHistory> {
  // First verify the todo exists and belongs to the current member
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
  });
  // Then retrieve the history record with proper ownership validation
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId,
        deleted_at: null, // Only active history records
      },
      ...TodoAppTodoHistoryTransformer.select(),
    });
  // Transform and return the complete history record
  return await TodoAppTodoHistoryTransformer.transform(history);
}
