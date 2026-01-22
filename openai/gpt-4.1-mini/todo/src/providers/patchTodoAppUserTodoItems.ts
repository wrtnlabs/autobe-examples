import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { IPageITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodoItems(props: {
  user: UserPayload;
  body: ITodoAppTodoItem.IRequest;
}): Promise<IPageITodoAppTodoItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Construct where input with user context and filters
  const where = {
    todo_app_user_id: props.user.id,
    deleted_at: null as null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.dueDateFrom !== undefined &&
      props.body.dueDateFrom !== null && {
        due_date: { gte: props.body.dueDateFrom },
      }),
    ...(props.body.dueDateTo !== undefined &&
      props.body.dueDateTo !== null && {
        due_date: { lte: props.body.dueDateTo },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
  } satisfies Prisma.todo_app_todo_itemsWhereInput;
  // Determine orderBy input
  const orderBy = (
    props.body.sortBy
      ? { [props.body.sortBy]: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_todo_itemsOrderByWithRelationInput;
  // Fetch paged data
  const data = await MyGlobal.prisma.todo_app_todo_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
  });
  // Fetch total count
  const total = await MyGlobal.prisma.todo_app_todo_items.count({
    where,
  });
  // Map data to ITodoAppTodoItem.ISummary with date conversion
  const resultData = data.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description === null ? null : item.description,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at:
      item.updated_at === null
        ? toISOStringSafe(item.created_at)
        : toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    user: {
      id: item.todo_app_user_id,
      email: "",
      username: "",
      created_at: "1970-01-01T00:00:00.000Z" as string &
        tags.Format<"date-time">,
      updated_at: null,
      deleted_at: null,
    },
    auditLogs: [],
  }));
  // Assemble pagination
  return {
    data: resultData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
