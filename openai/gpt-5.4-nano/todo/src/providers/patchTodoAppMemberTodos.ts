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

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const completionStatusFilter = props.body.completionStatusFilter ?? "all";
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_in_trash_at: null,
    ...(completionStatusFilter === "complete"
      ? { completion_status: true }
      : {}),
    ...(completionStatusFilter === "incomplete"
      ? { completion_status: false }
      : {}),
  };
  const records = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    select: {
      id: true,
      title: true,
      completion_status: true,
      created_at: true,
      start_date: true,
      due_date: true,
      deleted_in_trash_at: true,
    },
  });
  const direction = sortDirection === "asc" ? 1 : -1;
  const sorted = records.toSorted((a, b) => {
    if (sortBy === "created_at") {
      const av = a.created_at.getTime();
      const bv = b.created_at.getTime();
      return (av - bv) * direction;
    }
    if (sortBy === "start_date") {
      const aIsNull = a.start_date === null;
      const bIsNull = b.start_date === null;
      if (aIsNull && bIsNull) return 0;
      if (aIsNull) return 1;
      if (bIsNull) return -1;
      return (a.start_date!.getTime() - b.start_date!.getTime()) * direction;
    }
    // due_date
    const aIsNull = a.due_date === null;
    const bIsNull = b.due_date === null;
    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return 1;
    if (bIsNull) return -1;
    return (a.due_date!.getTime() - b.due_date!.getTime()) * direction;
  });
  const startIndex = (page - 1) * limit;
  const pageData = sorted.slice(startIndex, startIndex + limit);
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  const data = pageData.map((t) => ({
    id: t.id,
    title: t.title,
    completion_status: t.completion_status,
    created_at: toISOStringSafe(t.created_at),
    start_date: t.start_date === null ? null : toISOStringSafe(t.start_date),
    due_date: t.due_date === null ? null : toISOStringSafe(t.due_date),
    deleted_in_trash_at:
      t.deleted_in_trash_at === null
        ? null
        : toISOStringSafe(t.deleted_in_trash_at),
  })) satisfies IPageITodoAppTodo.ISummary["data"];
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
