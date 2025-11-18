import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function patchTodoAppMemberUserTodos(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = page * limit;

  const whereCondition = {
    todo_app_memberuser_id: props.memberUser.id,
    deleted_at: null,
    ...(props.body.state !== undefined && props.body.state !== null
      ? { state: props.body.state }
      : {}),
    ...(() => {
      if (props.body.search === undefined || props.body.search === null)
        return {};
      return {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      };
    })(),
    ...(() => {
      if (
        props.body.createdFrom === undefined &&
        props.body.createdTo === undefined
      )
        return {};
      return {
        created_at: {
          ...(props.body.createdFrom !== undefined &&
          props.body.createdFrom !== null
            ? { gte: props.body.createdFrom }
            : {}),
          ...(props.body.createdTo !== undefined &&
          props.body.createdTo !== null
            ? { lte: props.body.createdTo }
            : {}),
        },
      };
    })(),
    ...(() => {
      if (props.body.dueFrom === undefined && props.body.dueTo === undefined)
        return {};
      return {
        due_date: {
          ...(props.body.dueFrom !== undefined && props.body.dueFrom !== null
            ? { gte: props.body.dueFrom }
            : {}),
          ...(props.body.dueTo !== undefined && props.body.dueTo !== null
            ? { lte: props.body.dueTo }
            : {}),
        },
      };
    })(),
    ...(() => {
      if (props.body.completed === undefined || props.body.completed === null)
        return {};
      return props.body.completed
        ? { completed_at: { not: null } }
        : { completed_at: null };
    })(),
  } satisfies Prisma.todo_app_todosWhereInput;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereCondition,
    }),
  ]);

  const data: ITodoAppTodo.ISummary[] = rows.map((row) => {
    const dueDateValue =
      row.due_date === null ? null : toISOStringSafe(row.due_date);
    const completedAtValue =
      row.completed_at === null ? null : toISOStringSafe(row.completed_at);

    return {
      id: row.id,
      title: row.title,
      state: row.state,
      due_date: dueDateValue,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      completed_at: completedAtValue,
    };
  });

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: pages satisfies number as number,
    },
    data,
  };
}
