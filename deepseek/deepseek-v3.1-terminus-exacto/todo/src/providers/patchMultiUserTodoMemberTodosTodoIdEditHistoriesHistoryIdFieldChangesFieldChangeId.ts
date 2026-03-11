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

export async function patchMultiUserTodoMemberTodosTodoIdEditHistoriesHistoryIdFieldChangesFieldChangeId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  fieldChangeId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistoryFieldChange.IUpdate;
}): Promise<IMultiUserTodoEditHistoryFieldChange> {
  // Validate at least one field is provided
  if (
    props.body.field_name === undefined &&
    props.body.new_value === undefined
  ) {
    throw new HttpException("No fields provided for update", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify todo exists and belongs to member
    const todo = await prisma.multi_user_todo_todos.findUnique({
      where: {
        id: props.todoId,
        multi_user_todo_member_id: props.member.id,
      },
      select: { id: true },
    });
    if (!todo) {
      throw new HttpException("Todo not found or access denied", 404);
    }
    // Verify edit history exists and belongs to todo
    const editHistory = await prisma.multi_user_todo_edit_histories.findUnique({
      where: {
        id: props.historyId,
        multi_user_todo_todo_id: todo.id,
      },
      select: { id: true },
    });
    if (!editHistory) {
      throw new HttpException("Edit history not found or access denied", 404);
    }
    // Verify field change exists and belongs to edit history
    const existingFieldChange =
      await prisma.multi_user_todo_edit_history_field_changes.findUnique({
        where: {
          id: props.fieldChangeId,
          multi_user_todo_edit_history_id: editHistory.id,
        },
        select: { id: true },
      });
    if (!existingFieldChange) {
      throw new HttpException("Field change not found or access denied", 404);
    }
    // Prepare update data
    const updateData: Prisma.multi_user_todo_edit_history_field_changesUpdateInput =
      {};
    if (props.body.field_name !== undefined) {
      updateData.field_name = props.body.field_name;
    }
    if (props.body.new_value !== undefined) {
      updateData.new_value = props.body.new_value;
    }
    // Update field change
    const updated =
      await prisma.multi_user_todo_edit_history_field_changes.update({
        where: { id: existingFieldChange.id },
        data: updateData,
        ...MultiUserTodoEditHistoryFieldChangeTransformer.select(),
      });
    return MultiUserTodoEditHistoryFieldChangeTransformer.transform(updated);
  });
}
