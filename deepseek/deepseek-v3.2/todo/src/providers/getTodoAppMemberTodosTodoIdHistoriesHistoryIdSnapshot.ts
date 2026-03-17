import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistorySnapshotTransformer } from "../transformers/TodoAppTodoHistorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoriesHistoryIdSnapshot(props: {
  member: MemberPayload;
  todoId: string;
  historyId: string;
}): Promise<ITodoAppTodoHistorySnapshot> {
  // Step 1: Verify member owns the todo
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: { id: true },
  });
  if (!todo) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify history exists and belongs to the todo
  const history = await MyGlobal.prisma.todo_app_todo_histories.findUnique({
    where: {
      id: props.historyId,
      todo_app_todo_id: props.todoId,
    },
    select: { id: true },
  });
  if (!history) {
    throw new HttpException("Not Found", 404);
  }
  // Step 3: Retrieve the snapshot with transformer
  const snapshot =
    await MyGlobal.prisma.todo_app_todo_history_snapshots.findUniqueOrThrow({
      where: {
        todo_app_todo_history_id: props.historyId,
      },
      ...TodoAppTodoHistorySnapshotTransformer.select(),
    });
  // Step 4: Transform and return
  return await TodoAppTodoHistorySnapshotTransformer.transform(snapshot);
}
