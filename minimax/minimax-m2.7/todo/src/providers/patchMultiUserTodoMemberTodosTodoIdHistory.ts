import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoEditHistory.IRequest;
}): Promise<IPageIMultiUserTodoTodoEditHistory.ISummary> {
  // 1. Ownership Verification
  // Query todo to verify existence, ownership, and active status
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      deleted_at: true,
    },
  });
  // 2. Error Handling - Todo Not Found
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // 3. Error Handling - Unauthorized Access (403)
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Error Handling - Todo in Trash (400)
  if (todo.deleted_at !== null) {
    throw new HttpException("History not available for trashed todos", 400);
  }
  // 5. Pagination Setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Query History with Pagination - Order by created_at DESC (newest first)
  const histories =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findMany({
      where: { multi_user_todo_todo_id: props.todoId },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    });
  // 7. Count Total Records for Pagination Metadata
  const total = await MyGlobal.prisma.multi_user_todo_todo_edit_histories.count(
    {
      where: { multi_user_todo_todo_id: props.todoId },
    },
  );
  // 8. Map Results to ISummary Format
  const data: IMultiUserTodoTodoEditHistory.ISummary[] = histories.map(
    (history): IMultiUserTodoTodoEditHistory.ISummary => ({
      id: history.id,
      created_at: history.created_at.toISOString() as string &
        tags.Format<"date-time">,
      old_title: history.old_title,
      new_title: history.new_title,
      old_description: history.old_description,
      new_description: history.new_description,
      old_start_date:
        history.old_start_date !== null
          ? (history.old_start_date.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      new_start_date:
        history.new_start_date !== null
          ? (history.new_start_date.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      old_due_date:
        history.old_due_date !== null
          ? (history.old_due_date.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      new_due_date:
        history.new_due_date !== null
          ? (history.new_due_date.toISOString() as string &
              tags.Format<"date-time">)
          : null,
    }),
  );
  // 9. Return Paginated Response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
