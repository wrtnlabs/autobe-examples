import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with user filter and trash state
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.member.id,
    is_trashed: true,
    deleted_at: { not: null },
    trashEntry: {
      permanently_deleted_at: null,
    },
  };
  // Add completion status filter if not 'all'
  if (props.body.is_complete !== "all") {
    where.is_complete = props.body.is_complete === "true";
  }
  // Build order by clause
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {
    [props.body.sort_by === "created_at"
      ? "created_at"
      : props.body.sort_by === "start_date"
        ? "start_date"
        : "due_date"]: props.body.sort_order,
  };
  // Fetch data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...TodoAppTodoTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
