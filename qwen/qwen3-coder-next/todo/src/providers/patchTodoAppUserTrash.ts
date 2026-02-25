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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_user_id: props.user.id,
    is_deleted: true,
    ...(props.body.status !== null &&
    props.body.status !== undefined &&
    props.body.status !== "all"
      ? {
          is_complete: props.body.status === "complete",
        }
      : {}),
  } satisfies Prisma.todo_app_todosWhereInput;
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ deleted_at: "desc" as const }],
    select: {
      id: true,
      title: true,
      is_complete: true,
      start_date: true,
      due_date: true,
      created_at: true,
      user: {
        select: {
          id: true,
          email: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      title: record.title,
      is_complete: record.is_complete,
      start_date:
        record.start_date === null ? null : toISOStringSafe(record.start_date),
      due_date:
        record.due_date === null ? null : toISOStringSafe(record.due_date),
      created_at: toISOStringSafe(record.created_at),
      author: {
        id: record.user.id as string & tags.Format<"uuid">,
        email: record.user.email,
        created_at: toISOStringSafe(record.user.created_at),
      } satisfies ITodoAppUser.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
