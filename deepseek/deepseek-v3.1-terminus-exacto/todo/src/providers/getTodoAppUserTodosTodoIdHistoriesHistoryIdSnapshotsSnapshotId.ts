import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistorySnapshotItemTransformer } from "../transformers/TodoAppTodoHistorySnapshotItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistoriesHistoryIdSnapshotsSnapshotId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistorySnapshotItem> {
  // Query with proper hierarchy validation
  const snapshotItem =
    await MyGlobal.prisma.todo_app_todo_history_snapshot_items.findFirst({
      where: {
        id: props.snapshotId,
        snapshot: {
          id: props.historyId,
        },
        todo: {
          id: props.todoId,
          todo_app_user_id: props.user.id,
          deleted_at: null,
        },
      },
      ...TodoAppTodoHistorySnapshotItemTransformer.select(),
    });
  if (!snapshotItem) {
    throw new HttpException("Snapshot not found or access denied", 404);
  }
  return await TodoAppTodoHistorySnapshotItemTransformer.transform(
    snapshotItem,
  );
}
