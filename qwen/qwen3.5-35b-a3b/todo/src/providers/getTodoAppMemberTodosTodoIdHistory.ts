import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryTransformer } from "../transformers/TodoAppEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppEditHistory> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
    },
  });
  if (todo.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const historyEntries = await MyGlobal.prisma.todo_app_edit_histories.findMany(
    {
      where: {
        todo_app_todos_id: props.todoId,
      },
      orderBy: {
        created_at: "desc",
      },
      ...TodoAppEditHistoryTransformer.select(),
    },
  );
  if (historyEntries.length === 0) {
    throw new HttpException("No edit history found for this todo", 404);
  }
  return await TodoAppEditHistoryTransformer.transform(historyEntries[0]);
}
