import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.is_completed !== undefined
      ? {
          is_completed: props.body.is_completed,
        }
      : {}),
    ...(props.body.search !== undefined && props.body.search.trim().length > 0
      ? {
          OR: [
            {
              title: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.start_date_from !== undefined
      ? {
          start_date: {
            gte: new Date(props.body.start_date_from),
          },
        }
      : {}),
    ...(props.body.start_date_to !== undefined
      ? {
          start_date: {
            lte: new Date(props.body.start_date_to),
          },
        }
      : {}),
    ...(props.body.due_date_from !== undefined
      ? {
          due_date: {
            gte: new Date(props.body.due_date_from),
          },
        }
      : {}),
    ...(props.body.due_date_to !== undefined
      ? {
          due_date: {
            lte: new Date(props.body.due_date_to),
          },
        }
      : {}),
  } satisfies Prisma.todo_app_todosWhereInput;
  const sortColumn = props.body.sort_by ?? "createdAt";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput =
    sortColumn === "createdAt"
      ? { created_at: sortOrder }
      : sortColumn === "startDate"
        ? {
            start_date: { sort: sortOrder, nulls: "last" as Prisma.NullsOrder },
          }
        : { due_date: { sort: sortOrder, nulls: "last" as Prisma.NullsOrder } };
  const records = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      ...TodoAppTodoAtSummaryTransformer.select().select,
      member: {
        select: {
          id: true,
          display_name: true,
          created_at: true,
        },
      },
      snapshots: {
        select: {
          id: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    TodoAppTodoAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageITodoAppTodo.ISummary;
}
