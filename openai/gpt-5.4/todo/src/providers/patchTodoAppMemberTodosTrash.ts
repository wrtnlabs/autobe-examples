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
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    todo_app_member_id: props.member.id,
    deleted_at: {
      not: null,
    },
    ...(props.body.completed === "complete"
      ? {
          completed: true,
        }
      : props.body.completed === "incomplete"
        ? {
            completed: false,
          }
        : {}),
    ...(props.body.search !== undefined
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
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? [
          {
            created_at: "asc",
          },
          {
            updated_at: "desc",
          },
          {
            id: "asc",
          },
        ]
      : props.body.sort === "updated_at_asc"
        ? [
            {
              updated_at: "asc",
            },
            {
              id: "asc",
            },
          ]
        : props.body.sort === "updated_at_desc"
          ? [
              {
                updated_at: "desc",
              },
              {
                id: "asc",
              },
            ]
          : props.body.sort === "start_date_asc"
            ? [
                {
                  start_date: {
                    sort: "asc",
                    nulls: "last",
                  },
                },
                {
                  updated_at: "desc",
                },
                {
                  id: "asc",
                },
              ]
            : props.body.sort === "start_date_desc"
              ? [
                  {
                    start_date: {
                      sort: "desc",
                      nulls: "last",
                    },
                  },
                  {
                    updated_at: "desc",
                  },
                  {
                    id: "asc",
                  },
                ]
              : props.body.sort === "due_date_asc"
                ? [
                    {
                      due_date: {
                        sort: "asc",
                        nulls: "last",
                      },
                    },
                    {
                      updated_at: "desc",
                    },
                    {
                      id: "asc",
                    },
                  ]
                : props.body.sort === "due_date_desc"
                  ? [
                      {
                        due_date: {
                          sort: "desc",
                          nulls: "last",
                        },
                      },
                      {
                        updated_at: "desc",
                      },
                      {
                        id: "asc",
                      },
                    ]
                  : [
                      {
                        created_at: "desc",
                      },
                      {
                        updated_at: "desc",
                      },
                      {
                        id: "asc",
                      },
                    ]
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
