import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoAtSummaryTransformer } from "../transformers/MultiUserTodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with ownership isolation and soft-delete exclusion
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: null,
    // Status filter
    ...(props.body.status === "complete" && { completed: true }),
    ...(props.body.status === "incomplete" && { completed: false }),
    // Date range filters - start_date
    ...(props.body.startDateFrom !== undefined &&
      props.body.startDateFrom !== null && {
        start_date: { gte: new Date(props.body.startDateFrom) },
      }),
    ...(props.body.startDateTo !== undefined &&
      props.body.startDateTo !== null && {
        start_date: { lte: new Date(props.body.startDateTo) },
      }),
    // Date range filters - due_date
    ...(props.body.dueDateFrom !== undefined &&
      props.body.dueDateFrom !== null && {
        due_date: { gte: new Date(props.body.dueDateFrom) },
      }),
    ...(props.body.dueDateTo !== undefined &&
      props.body.dueDateTo !== null && {
        due_date: { lte: new Date(props.body.dueDateTo) },
      }),
  } satisfies Prisma.multi_user_todo_todosWhereInput;
  // Build ORDER BY clause with NULLS LAST for nullable date columns
  const sortOrder = props.body.sortOrder ?? "desc";
  let orderByInput: Prisma.multi_user_todo_todosOrderByWithRelationInput;
  if (props.body.sortBy === "startDate") {
    // Use raw expression for NULLS LAST
    orderByInput = [{ start_date: sortOrder }, { id: sortOrder }] as any;
  } else if (props.body.sortBy === "dueDate") {
    orderByInput = [{ due_date: sortOrder }, { id: sortOrder }] as any;
  } else {
    // Default: createdAt
    orderByInput = { created_at: sortOrder };
  }
  // Execute queries sequentially (findMany first, then count)
  const data = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...MultiUserTodoTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({
    where: whereInput,
  });
  // Transform and return with pagination metadata
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
  };
}
