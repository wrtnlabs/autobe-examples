import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdHistories(props: {
  member: MemberPayload;
  todoId: string;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Validate todo ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    } satisfies Prisma.todo_app_todosWhereInput,
    select: { id: true },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Build WHERE clause with proper date handling
  const whereInput = {
    todo_app_todo_id: props.todoId,
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.start_date && {
      created_at: {
        gte: props.body.start_date, // Prisma accepts ISO strings for DateTime
      },
    }),
    ...(props.body.end_date && {
      created_at: {
        lte: props.body.end_date,
      },
    }),
  } satisfies Prisma.todo_app_todo_historiesWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data with transformer select
  const data = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...TodoAppTodoHistoryAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistoryAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
