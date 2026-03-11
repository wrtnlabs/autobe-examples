import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoEditHistoryTransformer } from "../transformers/MultiUserTodoEditHistoryTransformer";
import { MultiUserTodoMemberAtSummaryTransformer } from "../transformers/MultiUserTodoMemberAtSummaryTransformer";
import { MultiUserTodoTodoAtSummaryTransformer } from "../transformers/MultiUserTodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdEditHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoEditHistory> {
  // First verify the todo exists and belongs to the authenticated member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { multi_user_todo_member_id: true },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Todo not found", 404);
  }
  // Then fetch the specific edit history with field changes
  const history =
    await MyGlobal.prisma.multi_user_todo_edit_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        multi_user_todo_todo_id: props.todoId,
      },
      select: {
        id: true,
        created_at: true,
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        fieldChanges: {
          select: {
            id: true,
            field_name: true,
            previous_value: true,
            new_value: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" as const },
        } satisfies Prisma.multi_user_todo_edit_history_field_changesFindManyArgs,
      },
    });
  // Transform the history without fieldChanges
  const transformedHistory =
    await MultiUserTodoEditHistoryTransformer.transform({
      id: history.id,
      created_at: history.created_at,
      todo: history.todo,
      member: history.member,
    });
  // Process fieldChanges separately
  const fieldChanges = await ArrayUtil.asyncMap(
    history.fieldChanges,
    async (fieldChange) => ({
      id: fieldChange.id,
      field_name: fieldChange.field_name,
      previous_value: fieldChange.previous_value,
      new_value: fieldChange.new_value,
      created_at: toISOStringSafe(fieldChange.created_at),
    }),
  );
  // Combine results with type assertion
  return typia.assert<IMultiUserTodoEditHistory>({
    ...transformedHistory,
    fieldChanges,
  });
}
