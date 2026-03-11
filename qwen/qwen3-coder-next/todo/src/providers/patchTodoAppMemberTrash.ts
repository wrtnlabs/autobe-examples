import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function patchTodoAppMemberTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.member.id,
    is_trashed: true,
  };
  if (props.body.status === "complete") {
    where.is_complete = true;
  } else if (props.body.status === "incomplete") {
    where.is_complete = false;
  }
  const orderByInput =
    props.body.sort === "createdAt"
      ? { created_at: (props.body.direction ?? "desc") as Prisma.SortOrder }
      : props.body.sort === "startAt"
        ? { start_date: (props.body.direction ?? "desc") as Prisma.SortOrder }
        : props.body.sort === "dueAt"
          ? { due_date: (props.body.direction ?? "desc") as Prisma.SortOrder }
          : { created_at: "desc" as Prisma.SortOrder };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        user: { select: { id: true, email: true } },
        editHistoryEntries: { select: { id: true } },
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where }),
  ]);
  const result = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    title: record.title,
    is_complete: record.is_complete,
    created_at: toISOStringSafe(record.created_at),
    start_date: record.start_date ? toISOStringSafe(record.start_date) : null,
    due_date: record.due_date ? toISOStringSafe(record.due_date) : null,
    is_trashed: record.is_trashed,
    user: {
      id: record.user.id as string & tags.Format<"uuid">,
      email: record.user.email,
    } satisfies ITodoAppUser.ISummary,
    edit_history_entries_count: record.editHistoryEntries.length,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: result,
  };
}
