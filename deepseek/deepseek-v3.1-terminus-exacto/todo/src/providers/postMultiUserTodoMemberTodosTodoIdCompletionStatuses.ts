import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoCompletionStatusCollector } from "../collectors/MultiUserTodoTodoCompletionStatusCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosTodoIdCompletionStatuses(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoCompletionStatus.ICreate;
}): Promise<IMultiUserTodoTodo> {
  // Verify todo exists and belongs to member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true, is_completed: true },
  });
  // Create completion status record using collector
  await MyGlobal.prisma.multi_user_todo_todo_completion_statuses.create({
    data: await MultiUserTodoTodoCompletionStatusCollector.collect({
      body: props.body,
      multiUserTodoTodos: { id: props.todoId },
      multiUserTodoMembers: { id: props.member.id },
    }),
  });
  // Update todo's is_completed field
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: { is_completed: props.body.is_completed, updated_at: new Date() },
  });
  // Fetch and return updated todo
  const updatedTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(updatedTodo);
}
