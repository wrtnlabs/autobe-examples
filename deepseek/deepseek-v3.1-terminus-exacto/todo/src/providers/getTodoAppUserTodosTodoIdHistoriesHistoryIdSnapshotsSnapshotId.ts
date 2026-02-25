import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistorySnapshotAttemTransformer } from "../transformers/TodoAppTodoHistorySnapshotAttemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistoriesHistoryIdSnapshotsSnapshotId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistorySnapshot.Item> {
  // First validate that the todo belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  // Validate that the history belongs to this todo
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
    });
  // Validate that the snapshot belongs to this history
  const snapshot =
    await MyGlobal.prisma.todo_app_todo_history_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        todo_app_todo_history_id: props.historyId,
      },
    });
  // Finally retrieve the snapshot item
  const snapshotItem =
    await MyGlobal.prisma.todo_app_todo_history_snapshot_items.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          todo_app_todo_id: props.todoId,
        },
        ...TodoAppTodoHistorySnapshotAttemTransformer.select(),
      },
    );
  return await TodoAppTodoHistorySnapshotAttemTransformer.transform(
    snapshotItem,
  );
}
