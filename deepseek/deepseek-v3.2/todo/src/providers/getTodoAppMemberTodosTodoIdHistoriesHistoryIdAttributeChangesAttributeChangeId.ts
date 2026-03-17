import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryAttributeChangeTransformer } from "../transformers/TodoAppTodoHistoryAttributeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoriesHistoryIdAttributeChangesAttributeChangeId(props: {
  member: MemberPayload;
  todoId: string;
  historyId: string;
  attributeChangeId: string;
}): Promise<ITodoAppTodoHistoryAttributeChange> {
  // Verify todo ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: { id: true },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Verify history belongs to todo
  const history = await MyGlobal.prisma.todo_app_todo_histories.findFirst({
    where: {
      id: props.historyId,
      todo_app_todo_id: props.todoId,
    },
    select: { id: true },
  });
  if (!history) {
    throw new HttpException(
      "History not found or does not belong to todo",
      404,
    );
  }
  // Retrieve attribute change with transformer select
  const attributeChange =
    await MyGlobal.prisma.todo_app_todo_history_attribute_changes.findUniqueOrThrow(
      {
        where: { id: props.attributeChangeId },
        ...TodoAppTodoHistoryAttributeChangeTransformer.select(),
      },
    );
  // Verify attribute change belongs to history
  if (attributeChange.todoHistory.id !== props.historyId) {
    throw new HttpException("Attribute change does not belong to history", 404);
  }
  return await TodoAppTodoHistoryAttributeChangeTransformer.transform(
    attributeChange,
  );
}
