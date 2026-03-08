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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const completionFilter: "all" | "complete" | "incomplete" | undefined =
    props.body.completionStatus;
  const completionWhere: {
    is_complete?: boolean;
  } = {};
  if (completionFilter === "complete") {
    completionWhere.is_complete = true;
  } else if (completionFilter === "incomplete") {
    completionWhere.is_complete = false;
  }
  const sortKey: "createdAt" | "startDate" | "dueDate" | undefined =
    props.body.sortKey ?? "createdAt";
  const sortOrder: "asc" | "desc" | undefined = props.body.sortOrder ?? "desc";
  const orderByMap: Record<string, string> = {
    createdAt: "created_at",
    startDate: "start_date",
    dueDate: "due_date",
  };
  const orderField: string = orderByMap[sortKey];
  const orderDirection: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";
  const whereInput: Prisma.todo_app_todosWhereInput = {
    is_deleted: true,
    member_id: props.member.id,
    ...completionWhere,
  };
  const orderByInput: Prisma.todo_app_todosOrderByWithRelationInput = {
    [orderField]: orderDirection,
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_complete: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where: whereInput }),
  ]);
  const transformedData: ITodoAppTodo.ISummary[] = data.map(
    (todo): ITodoAppTodo.ISummary => ({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      start_date:
        todo.start_date !== null
          ? (todo.start_date.toISOString() as string & tags.Format<"date-time">)
          : null,
      due_date:
        todo.due_date !== null
          ? (todo.due_date.toISOString() as string & tags.Format<"date-time">)
          : null,
      is_complete: todo.is_complete,
      created_at: todo.created_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at:
        todo.deleted_at !== null
          ? (todo.deleted_at.toISOString() as string & tags.Format<"date-time">)
          : null,
    }),
  );
  const pages: number = total > 0 ? Math.ceil(total / limit) : 0;
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  };
  const result: IPageITodoAppTodo.ISummary = {
    pagination,
    data: transformedData,
  };
  return result;
}
