import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodoEditHistory";
import { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/PrivateTodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchPrivateTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IPrivateTodoAppTodoEditHistory.IRequest;
}): Promise<IPageIPrivateTodoAppTodoEditHistory.ISummary> {
  // Verify todo ownership
  const todo = await MyGlobal.prisma.private_todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, user_id: true },
  });
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query edit histories
  const data =
    await MyGlobal.prisma.private_todo_app_todo_edit_histories.findMany({
      where: { private_todo_app_todo_id: props.todoId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...PrivateTodoAppTodoEditHistoryAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.private_todo_app_todo_edit_histories.count({
      where: { private_todo_app_todo_id: props.todoId },
    });
  // Return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      PrivateTodoAppTodoEditHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIPrivateTodoAppTodoEditHistory.ISummary;
}
