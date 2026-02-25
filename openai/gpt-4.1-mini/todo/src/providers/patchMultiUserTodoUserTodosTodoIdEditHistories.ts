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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserTodosTodoIdEditHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoEditHistory.IRequest;
}): Promise<IPageIMultiUserTodoTodoEditHistory.ISummary> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
    select: { multi_user_todo_user_id: true },
  });
  if (!todo || todo.multi_user_todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereClause: Prisma.multi_user_todo_todo_edit_historiesWhereInput = {
    multi_user_todo_todo_id: props.todoId,
    deleted_at: null,
    ...(props.body.startDate !== undefined && props.body.startDate !== null
      ? { created_at: { gte: props.body.startDate } }
      : {}),
    ...(props.body.endDate !== undefined && props.body.endDate !== null
      ? { created_at: { lte: props.body.endDate } }
      : {}),
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
      ? {
          OR: [
            {
              changed_title: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              changed_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
  const total = await MyGlobal.prisma.multi_user_todo_todo_edit_histories.count(
    {
      where: whereClause,
    },
  );
  const records =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: sortOrder },
      select: {
        id: true,
        changed_title: true,
        changed_description: true,
        changed_start_date: true,
        changed_due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        multi_user_todo_todo_id: true,
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      changedTitle: record.changed_title ?? null,
      changedDescription: record.changed_description ?? null,
      changedStartDate:
        record.changed_start_date == null
          ? null
          : (toISOStringSafe(record.changed_start_date) as string &
              tags.Format<"date-time">),
      changedDueDate:
        record.changed_due_date == null
          ? null
          : (toISOStringSafe(record.changed_due_date) as string &
              tags.Format<"date-time">),
      createdAt: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        record.deleted_at == null
          ? null
          : (toISOStringSafe(record.deleted_at) as string &
              tags.Format<"date-time">),
      todoId: record.multi_user_todo_todo_id,
    })),
  };
}
