import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoTodoEditHistoryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserTodosTodoIdEditHistoriesEditHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoEditHistory> {
  // Validate ownership of todo
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!todo) {
    throw new HttpException(
      "Edit history entry not found or access denied",
      404,
    );
  }
  // Fetch edit history entry belonging to the todo
  const editHistory =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findFirst({
      where: {
        id: props.editHistoryId,
        multi_user_todo_todo_id: props.todoId,
        deleted_at: null,
      },
      ...MultiUserTodoTodoEditHistoryTransformer.select(),
    });
  if (!editHistory) {
    throw new HttpException(
      "Edit history entry not found or access denied",
      404,
    );
  }
  return await MultiUserTodoTodoEditHistoryTransformer.transform(editHistory);
}
