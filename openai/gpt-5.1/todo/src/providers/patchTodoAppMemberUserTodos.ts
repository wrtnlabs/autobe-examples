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
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function patchTodoAppMemberUserTodos(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const body = props.body;

  // Normalize createdFrom/createdTo into Prisma-compatible string filters
  const createdFrom: string | undefined =
    body.createdFrom !== undefined && body.createdFrom !== null
      ? (body.createdFrom satisfies string as string)
      : undefined;
  const createdTo: string | undefined =
    body.createdTo !== undefined && body.createdTo !== null
      ? (body.createdTo satisfies string as string)
      : undefined;

  const createdAtFilter:
    | {
        gte?: string;
        lte?: string;
      }
    | undefined = (() => {
    const hasFrom = createdFrom !== undefined;
    const hasTo = createdTo !== undefined;
    if (!hasFrom && !hasTo) return undefined;
    const filter: { gte?: string; lte?: string } = {};
    if (hasFrom) filter.gte = createdFrom as string;
    if (hasTo) filter.lte = createdTo as string;
    return filter;
  })();

  // Base where condition: only non-deleted todos of the authenticated member user
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_memberuser_id: props.memberUser.id satisfies string as string,
    deleted_at: null,
    // Status filter
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    // Created_at range filters
    ...(createdAtFilter !== undefined
      ? {
          created_at: createdAtFilter,
        }
      : {}),
    // Completed state filter
    ...(() => {
      if (body.completed === undefined || body.completed === null) return {};
      return body.completed === true
        ? { completed_at: { not: null } }
        : { completed_at: null };
    })(),
    // Text search across title and description
    ...(() => {
      if (
        body.search === undefined ||
        body.search === null ||
        body.search === ""
      )
        return {};
      const search: string = body.search satisfies string as string;
      return {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      };
    })(),
  };

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Determine orderBy mapping from API field to DB column
  const orderByField = (() => {
    if (body.orderBy === undefined || body.orderBy === null)
      return "created_at" as const;
    if (body.orderBy === "createdAt") return "created_at" as const;
    if (body.orderBy === "updatedAt") return "updated_at" as const;
    if (body.orderBy === "completedAt") return "completed_at" as const;
    return "created_at" as const;
  })();

  const orderDirection: "asc" | "desc" = (() => {
    if (body.orderDirection === "asc" || body.orderDirection === "desc")
      return body.orderDirection;
    return "desc";
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
      include: {
        memberUser: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where,
    }),
  ]);

  const data: ITodoAppTodo.ISummary[] = rows.map((row) => {
    const member = (row as any).memberUser;

    const memberLastLoginAt =
      member.last_login_at === null
        ? null
        : toISOStringSafe(member.last_login_at as any);

    const completedAt =
      row.completed_at === null
        ? null
        : toISOStringSafe(row.completed_at as any);

    const summaryMemberUser: ITodoAppMemberuser.ISummary = {
      id: member.id,
      email: member.email,
      display_name: member.display_name === null ? null : member.display_name,
      status: member.status,
      last_login_at: memberLastLoginAt,
    };

    const summaryTodo: ITodoAppTodo.ISummary = {
      id: row.id,
      title: row.title,
      status: row.status,
      created_at: toISOStringSafe(row.created_at as any),
      updated_at: toISOStringSafe(row.updated_at as any),
      completed_at: completedAt,
      memberUser: summaryMemberUser,
    };

    return summaryTodo;
  });

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
