import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoCompletionStatusTransformer } from "../transformers/MultiUserTodoTodoCompletionStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdCompletionStatusesCompletionStatusId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  completionStatusId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoCompletionStatus> {
  // 1. Verify todo exists and belongs to member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId, deleted_at: null },
    select: { id: true, multi_user_todo_member_id: true },
  });
  // Check ownership
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify completion status exists and belongs to this todo
  const completionStatus =
    await MyGlobal.prisma.multi_user_todo_todo_completion_statuses.findUniqueOrThrow(
      {
        where: {
          id: props.completionStatusId,
          todo: { id: todo.id }, // Use relation property name, not column
        },
        ...MultiUserTodoTodoCompletionStatusTransformer.select(),
      },
    );
  // 3. Transform and return using existing transformer
  return await MultiUserTodoTodoCompletionStatusTransformer.transform(
    completionStatus,
  );
}
