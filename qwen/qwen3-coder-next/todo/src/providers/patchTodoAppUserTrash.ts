import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrash";
import { ITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrash";
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

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTodoTrash.IRequest;
}): Promise<IPageITodoAppTodoTrash.ISummary> {
  // Fetch data and total count
  const data = await MyGlobal.prisma.todo_app_todo_trashes.findMany({
    where: {
      user_id: props.user.id,
    },
    orderBy: {
      deleted_at: "desc",
    },
    select: {
      id: true,
      todo_id: true,
      title: true,
      deleted_at: true,
      todo: {
        select: {
          due_date: true,
          start_date: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.todo_app_todo_trashes.count({
    where: {
      user_id: props.user.id,
    },
  });
  // Transform to response DTO
  const transformedData: ITodoAppTodoTrash.ISummary[] = data.map((record) => ({
    id: record.id,
    todo_id: record.todo_id,
    title: record.title,
    deleted_at: toISOStringSafe(record.deleted_at),
    due_date: record.todo?.due_date
      ? toISOStringSafe(record.todo.due_date)
      : null,
    start_date: record.todo?.start_date
      ? toISOStringSafe(record.todo.start_date)
      : null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: 10,
      records: total,
      pages: Math.ceil(total / 10) || 1,
    },
  };
}
