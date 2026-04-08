import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoAtEditEntryTransformer } from "../transformers/MultiUserTodoTodoAtEditEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo.IEditEntry> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, multi_user_todo_member_id: true },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const records = await MyGlobal.prisma.multi_user_todo_todos_edits.findMany({
    where: { todo_id: props.todoId, deleted_at: null },
    orderBy: { edited_at: "desc" },
    ...MultiUserTodoTodoAtEditEntryTransformer.select(),
  });
  if (records.length === 0) {
    throw new HttpException("Not Found", 404);
  }
  return await MultiUserTodoTodoAtEditEntryTransformer.transform(records[0]);
}
