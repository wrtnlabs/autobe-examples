import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGlobalSearch";
import { IPageITodoAppSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSearchResult";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserSearchGlobal(props: {
  todoUser: TodouserPayload;
  body: ITodoAppGlobalSearch.IRequest;
}): Promise<IPageITodoAppSearchResult.ISummary> {
  const { todoUser, body } = props;

  if (!todoUser || !todoUser.id) {
    throw new HttpException("Unauthorized", 401);
  }

  const query = body.query ?? undefined;
  const page = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 25);
  const entityFilters = body.entityFilters ?? ["task", "list", "user", "tag"];

  const escapeRegExp = (s: string) =>
    s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");

  const scoreFor = (text: string | null | undefined, q: string | undefined) => {
    if (!q || !text) return 0;
    const low = text.toLowerCase();
    const qlow = q.toLowerCase();
    let score = 0;
    if (low.includes(qlow)) score += 10;
    const safe = escapeRegExp(qlow);
    const occurrences = (low.match(new RegExp(safe, "g")) || []).length;
    score += occurrences;
    return score;
  };

  try {
    const tasksPromise = entityFilters.includes("task")
      ? MyGlobal.prisma.todo_app_tasks.findMany({
          where: {
            deleted_at: null,
            ...(query !== undefined &&
              query !== null && {
                OR: [
                  { title: { contains: query } },
                  { description: { contains: query } },
                ],
              }),
            OR: [
              { list: { visibility: { not: "private" } } },
              { list: { todo_app_todouser_id: todoUser.id } },
              {
                list: {
                  todo_app_list_collaborators: {
                    some: {
                      todo_app_todouser_id: todoUser.id,
                      deleted_at: null,
                    },
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            todo_app_list_id: true,
            created_at: true,
            updated_at: true,
          },
          take: limit * 5,
        })
      : Promise.resolve([]);

    const listsPromise = entityFilters.includes("list")
      ? MyGlobal.prisma.todo_app_lists.findMany({
          where: {
            deleted_at: null,
            ...(query !== undefined &&
              query !== null && {
                OR: [
                  { title: { contains: query } },
                  { description: { contains: query } },
                ],
              }),
            OR: [
              { visibility: { not: "private" } },
              { todo_app_todouser_id: todoUser.id },
              {
                todo_app_list_collaborators: {
                  some: { todo_app_todouser_id: todoUser.id, deleted_at: null },
                },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            visibility: true,
            todo_app_todouser_id: true,
            created_at: true,
            updated_at: true,
          },
          take: limit * 5,
        })
      : Promise.resolve([]);

    const tagsPromise = entityFilters.includes("tag")
      ? MyGlobal.prisma.todo_app_task_tags.findMany({
          where: {
            deleted_at: null,
            ...(query !== undefined &&
              query !== null && { name: { contains: query } }),
          },
          select: { id: true, name: true, created_at: true, updated_at: true },
          take: limit * 5,
        })
      : Promise.resolve([]);

    const usersPromise = entityFilters.includes("user")
      ? MyGlobal.prisma.todo_app_todouser.findMany({
          where: {
            deleted_at: null,
            ...(query !== undefined &&
              query !== null && {
                OR: [
                  { display_name: { contains: query } },
                  { email: { contains: query } },
                ],
              }),
          },
          select: {
            id: true,
            display_name: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
          take: limit * 5,
        })
      : Promise.resolve([]);

    const [tasks, lists, tags, users] = await Promise.all([
      tasksPromise,
      listsPromise,
      tagsPromise,
      usersPromise,
    ]);

    const results: Array<ITodoAppSearchResult.ISummary> = [];

    for (const t of tasks) {
      const s =
        scoreFor(t.title, query) + scoreFor(t.description ?? null, query);
      results.push({
        id: t.id,
        targetType: "task",
        targetId: t.id,
        title: t.title,
        snippet: body.includeSnippets
          ? (t.description ?? undefined)
          : undefined,
        href: `/lists/${t.todo_app_list_id}/tasks/${t.id}`,
        score: s > 0 ? s : undefined,
        createdAt: t.created_at ? toISOStringSafe(t.created_at) : undefined,
        updatedAt: t.updated_at ? toISOStringSafe(t.updated_at) : undefined,
      });
    }

    for (const l of lists) {
      const s =
        scoreFor(l.title, query) + scoreFor(l.description ?? null, query);
      results.push({
        id: l.id,
        targetType: "list",
        targetId: l.id,
        title: l.title,
        snippet: body.includeSnippets
          ? (l.description ?? undefined)
          : undefined,
        href: `/lists/${l.id}`,
        score: s > 0 ? s : undefined,
        createdAt: l.created_at ? toISOStringSafe(l.created_at) : undefined,
        updatedAt: l.updated_at ? toISOStringSafe(l.updated_at) : undefined,
      });
    }

    for (const tg of tags) {
      const s = scoreFor(tg.name, query);
      results.push({
        id: tg.id,
        targetType: "tag",
        targetId: tg.id,
        title: tg.name,
        snippet: undefined,
        href: `/tags/${tg.id}`,
        score: s > 0 ? s : undefined,
        createdAt: tg.created_at ? toISOStringSafe(tg.created_at) : undefined,
        updatedAt: tg.updated_at ? toISOStringSafe(tg.updated_at) : undefined,
      });
    }

    for (const u of users) {
      const allowed =
        body.restrictToAccessible === false || u.id === todoUser.id;
      if (!allowed) continue;
      const display = u.display_name ?? u.email;
      const s = scoreFor(display, query) + scoreFor(u.email ?? null, query);
      results.push({
        id: u.id,
        targetType: "user",
        targetId: u.id,
        title: display,
        snippet: undefined,
        href: `/users/${u.id}`,
        score: s > 0 ? s : undefined,
        createdAt: u.created_at ? toISOStringSafe(u.created_at) : undefined,
        updatedAt: u.updated_at ? toISOStringSafe(u.updated_at) : undefined,
      });
    }

    const sorted = results.sort((a, b) => {
      const sortBy = body.sortBy ?? "relevance";
      if (sortBy === "createdAt") {
        const ta = a.createdAt ?? "";
        const tb = b.createdAt ?? "";
        if (ta === tb) return 0;
        return (body.order === "asc" ? 1 : -1) * (ta < tb ? -1 : 1);
      }
      const sa = a.score ?? 0;
      const sb = b.score ?? 0;
      if (sb === sa) return 0;
      return sb - sa;
    });

    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const pageData = sorted.slice(start, start + limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Number(pages),
      },
      data: pageData,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
