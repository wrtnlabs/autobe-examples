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
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (todo === null) {
    throw new HttpException("Todo not found or access forbidden", 404);
  }
  // Default pagination since props.body.page and limit do not exist
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    multi_user_todo_todo_id: props.todoId,
    deleted_at: null,
  } satisfies Prisma.multi_user_todo_todo_edit_historiesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_todo_edit_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        changed_title: true,
        changed_description: true,
        changed_start_date: true,
        changed_due_date: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.multi_user_todo_todo_edit_histories.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      changed_title:
        record.changed_title === null ? undefined : record.changed_title,
      changed_description:
        record.changed_description === null
          ? undefined
          : record.changed_description,
      changed_start_date:
        record.changed_start_date === null
          ? undefined
          : toISOStringSafe(record.changed_start_date),
      changed_due_date:
        record.changed_due_date === null
          ? undefined
          : toISOStringSafe(record.changed_due_date),
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
