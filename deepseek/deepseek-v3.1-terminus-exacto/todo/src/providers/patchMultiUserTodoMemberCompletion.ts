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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberCompletion(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoCompletionStatus.IRequest;
}): Promise<IMultiUserTodoTodo> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // First, find the first active todo that belongs to the member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      is_completed: true,
    },
  });
  if (!todo) {
    throw new HttpException("No active todos found", 404);
  }
  // Perform atomic toggle transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update the todo's completion status
    const updatedTodo = await prisma.multi_user_todo_todos.update({
      where: { id: todo.id },
      data: {
        is_completed: !todo.is_completed,
        updated_at: new Date(),
      },
    });
    // Create completion status history record
    await prisma.multi_user_todo_todo_completion_statuses.create({
      data: {
        id: v4(),
        multi_user_todo_todo_id: todo.id,
        is_completed: !todo.is_completed,
        created_at: new Date(),
      },
    });
    return updatedTodo;
  });
  // Fetch complete todo with transformer
  const completeTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: result.id },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(completeTodo);
}
