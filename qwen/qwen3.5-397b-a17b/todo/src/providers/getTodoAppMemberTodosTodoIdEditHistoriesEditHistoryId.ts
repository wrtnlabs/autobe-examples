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

export async function getTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoEditHistory> {
  const editHistory =
    await MyGlobal.prisma.todo_app_todo_edit_histories.findUniqueOrThrow({
      where: { id: props.editHistoryId },
      select: {
        id: true,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
        completed: true,
        created_at: true,
        todo: {
          select: {
            id: true,
            todo_app_member_id: true,
          },
        },
      },
    });
  if (editHistory.todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppTodoEditHistoryTransformer.transform(editHistory);
}
