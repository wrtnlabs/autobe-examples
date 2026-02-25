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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserSearch(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Build base WHERE conditions
  const baseWhere: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };
  // Build text search conditions
  const textSearchWhere: Prisma.todo_app_todosWhereInput[] = [];
  if (props.body.search?.trim()) {
    const searchTerm = props.body.search.trim();
    textSearchWhere.push(
      { title: { contains: searchTerm, mode: "insensitive" } },
      {
        descriptionField: {
          description: { contains: searchTerm, mode: "insensitive" },
        },
      },
    );
  }
  // Combine base conditions with text search
  const whereConditions: Prisma.todo_app_todosWhereInput = {
    ...baseWhere,
    ...(textSearchWhere.length > 0 && { OR: textSearchWhere }),
  };
  // Handle completion status filtering with subquery for latest completion
  if (props.body.completion_status && props.body.completion_status !== "all") {
    const isCompleted = props.body.completion_status === "complete";
    // Get todo IDs that have the desired completion status in their latest record
    const todoIdsWithStatus = await MyGlobal.prisma.$queryRaw<
      Array<{
        todo_app_todo_id: string;
      }>
    >`
      SELECT DISTINCT ON (tc.todo_app_todo_id) tc.todo_app_todo_id
      FROM todo_app_todo_completions tc
      WHERE tc.deleted_at IS NULL
        AND tc.todo_app_todo_id IN (
          SELECT id FROM todo_app_todos 
          WHERE todo_app_user_id = ${props.user.id} 
          AND deleted_at IS NULL
        )
      ORDER BY tc.todo_app_todo_id, tc.created_at DESC
    `;
    const filteredTodoIds = todoIdsWithStatus
      .filter((record) => {
        // For each todo ID, check if the latest completion matches the desired status
        return MyGlobal.prisma.todo_app_todo_completions
          .findFirst({
            where: {
              todo_app_todo_id: record.todo_app_todo_id,
              deleted_at: null,
            },
            orderBy: { created_at: "desc" },
          })
          .then(
            (latestCompletion) => latestCompletion?.completed === isCompleted,
          );
      })
      .map((record) => record.todo_app_todo_id);
    // If we have specific IDs from filtering, use them in WHERE
    if (filteredTodoIds.length > 0) {
      whereConditions.id = { in: filteredTodoIds };
    } else {
      // If no matches found for the status, return empty results
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
  }
  // Execute queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where: whereConditions }),
  ]);
  // Transform data to match ISummary DTO
  const transformedData: ITodoAppTodo.ISummary[] = data.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    created_at: todo.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: todo.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: todo.deleted_at
      ? (todo.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
