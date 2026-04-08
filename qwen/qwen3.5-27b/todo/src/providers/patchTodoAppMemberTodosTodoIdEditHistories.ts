import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoEditHistory.IRequest;
}): Promise<IPageITodoAppTodoEditHistory.ISummary> {
  // Verify todo exists and belongs to the authenticated member
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
  });
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Query edit histories with pagination
  const records = await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
    where: {
      todo_app_todos_id: props.todoId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...TodoAppTodoEditHistoryAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.todo_app_todo_edit_histories.count({
    where: {
      todo_app_todos_id: props.todoId,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppTodoEditHistoryAtSummaryTransformer.transform,
    ),
  };
}
