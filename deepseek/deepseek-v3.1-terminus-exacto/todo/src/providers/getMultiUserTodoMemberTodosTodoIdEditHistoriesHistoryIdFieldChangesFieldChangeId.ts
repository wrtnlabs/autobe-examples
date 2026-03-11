import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import { IMultiUserTodoEditHistoryFieldChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryFieldChange";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoEditHistoryFieldChangeTransformer } from "../transformers/MultiUserTodoEditHistoryFieldChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdEditHistoriesHistoryIdFieldChangesFieldChangeId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  fieldChangeId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoEditHistoryFieldChange> {
  // First, verify the todo exists, belongs to the member, and is not soft-deleted
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null, // Ensure todo is not in trash
    },
    select: { id: true },
  });
  // Verify the edit history exists and belongs to this todo
  const editHistory =
    await MyGlobal.prisma.multi_user_todo_edit_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        multi_user_todo_todo_id: todo.id,
      },
      select: { id: true },
    });
  // Retrieve the field change with transformer select
  const fieldChange =
    await MyGlobal.prisma.multi_user_todo_edit_history_field_changes.findUniqueOrThrow(
      {
        where: {
          id: props.fieldChangeId,
          multi_user_todo_edit_history_id: editHistory.id,
        },
        ...MultiUserTodoEditHistoryFieldChangeTransformer.select(),
      },
    );
  return await MultiUserTodoEditHistoryFieldChangeTransformer.transform(
    fieldChange,
  );
}
