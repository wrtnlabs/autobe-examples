import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with data isolation and filtering
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: null, // Exclude soft-deleted todos
    ...(props.body.is_completed !== undefined &&
      props.body.is_completed !== null && {
        is_completed: props.body.is_completed,
      }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.multi_user_todo_todosWhereInput;
  // Build ORDER BY clause with handling for todos without dates
  const orderByInput = (() => {
    if (!props.body.sort_by || !props.body.sort_direction) {
      // Default sorting by creation date descending
      return {
        created_at: "desc",
      } satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput;
    }
    if (props.body.sort_by === "created_at") {
      return {
        created_at: props.body.sort_direction,
      } satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput;
    }
    if (props.body.sort_by === "start_date") {
      // Handle null start dates by ordering them last
      return [
        {
          start_date: {
            sort: props.body.sort_direction,
            nulls: "last" satisfies Prisma.NullsOrder as Prisma.NullsOrder,
          },
        },
        {
          created_at: "desc",
        },
      ] satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput[];
    }
    if (props.body.sort_by === "due_date") {
      // Handle null due dates by ordering them last
      return [
        {
          due_date: {
            sort: props.body.sort_direction,
            nulls: "last" satisfies Prisma.NullsOrder as Prisma.NullsOrder,
          },
        },
        {
          created_at: "desc",
        },
      ] satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput[];
    }
    return {
      created_at: "desc",
    } satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput;
  })();
  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_todos.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...MultiUserTodoTodoAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_todos.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoTodoAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIMultiUserTodoTodo.ISummary;
}
