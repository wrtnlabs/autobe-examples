import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoSnapshotTransformer } from "../transformers/MultiUserTodoTodoSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosTodoIdSnapshots(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoSnapshot> {
  // 1. Verify the todo exists and belongs to the member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_completed: true,
      deleted_at: true,
    },
  });
  // Ownership check
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Create snapshot with current todo state
  const snapshotId = v4();
  const now = new Date();
  const snapshot = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.multi_user_todo_todo_snapshots.create({
      data: {
        id: snapshotId,
        multi_user_todo_todo_id: todo.id,
        title: todo.title,
        description: todo.description,
        start_date: todo.start_date,
        due_date: todo.due_date,
        is_completed: todo.is_completed,
        is_deleted: todo.deleted_at !== null,
        created_at: now,
      },
      ...MultiUserTodoTodoSnapshotTransformer.select(),
    });
  });
  // 3. Transform and return
  return await MultiUserTodoTodoSnapshotTransformer.transform(snapshot);
}
