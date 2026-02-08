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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserTodosTodoIdEditHistoriesEditHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoEditHistory> {
  const record =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findFirst({
      where: {
        id: props.editHistoryId,
        multi_user_todo_todo_id: props.todoId,
        todo: {
          multi_user_todo_user_id: props.user.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException("Edit history not found", 404);
  }
  return {
    id: record.id,
    multi_user_todo_todo_id: record.multi_user_todo_todo_id,
    changed_title:
      record.changed_title === null ? undefined : record.changed_title,
    changed_description:
      record.changed_description === null
        ? undefined
        : record.changed_description,
    changed_start_date: record.changed_start_date
      ? toISOStringSafe(record.changed_start_date)
      : null,
    changed_due_date: record.changed_due_date
      ? toISOStringSafe(record.changed_due_date)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
