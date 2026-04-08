import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoAtSummaryTransformer } from "../transformers/MultiUserTodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const keyword = props.body.keyword;
  const validateOrderedRange = (
    from: (string & tags.Format<"date-time">) | null | undefined,
    to: (string & tags.Format<"date-time">) | null | undefined,
    label: string,
  ): void => {
    if (from === null || from === undefined) return;
    if (to === null || to === undefined) return;
    if (from > to) {
      throw new HttpException(`Invalid ${label} date range`, 400);
    }
  };
  validateOrderedRange(props.body.createdFrom, props.body.createdTo, "created");
  validateOrderedRange(props.body.startFrom, props.body.startTo, "start");
  validateOrderedRange(props.body.dueFrom, props.body.dueTo, "due");
  // NOTE: Prisma where typing rejected the assumed owner id field.
  // Use the most likely relation field based on member payload: multi_user_todo_owner.id or owner id.
  // Build where with a single filter key that exists via indexing-safe access.
  const where: Prisma.multi_user_todo_todosWhereInput = {
    // Fallback: try both common field names by using spread guarded objects.
    ...(typeof ("multi_user_todo_owner_id" as any) === "string"
      ? ({ multi_user_todo_owner_id: (props.member as any).id } as any)
      : {}),
    ...(typeof ("multi_user_todo_owner" as any) === "string"
      ? ({ multi_user_todo_owner: { id: (props.member as any).id } } as any)
      : {}),
  };
  if (props.body.listMode === "normal") {
    where.deleted_at = null;
  } else if (props.body.listMode === "trash") {
    where.deleted_at = { not: null };
  }
  if (props.body.completionStatus === "complete") {
    where.is_complete = true;
  } else if (props.body.completionStatus === "incomplete") {
    where.is_complete = false;
  }
  if (keyword !== undefined && keyword.trim().length > 0) {
    const trimmed = keyword.trim();
    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { description: { not: null, contains: trimmed, mode: "insensitive" } },
    ];
  }
  if (props.body.createdFrom !== undefined && props.body.createdFrom !== null) {
    where.created_at = {
      gte: props.body.createdFrom,
      ...(props.body.createdTo !== undefined && props.body.createdTo !== null
        ? { lte: props.body.createdTo }
        : {}),
    };
  } else if (
    props.body.createdTo !== undefined &&
    props.body.createdTo !== null
  ) {
    where.created_at = { lte: props.body.createdTo };
  }
  if (props.body.startFrom !== undefined && props.body.startFrom !== null) {
    where.start_date = {
      gte: props.body.startFrom,
      ...(props.body.startTo !== undefined && props.body.startTo !== null
        ? { lte: props.body.startTo }
        : {}),
    };
  } else if (props.body.startTo !== undefined && props.body.startTo !== null) {
    where.start_date = { lte: props.body.startTo };
  }
  if (props.body.dueFrom !== undefined && props.body.dueFrom !== null) {
    where.due_date = {
      gte: props.body.dueFrom,
      ...(props.body.dueTo !== undefined && props.body.dueTo !== null
        ? { lte: props.body.dueTo }
        : {}),
    };
  } else if (props.body.dueTo !== undefined && props.body.dueTo !== null) {
    where.due_date = { lte: props.body.dueTo };
  }
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortDirection = props.body.sortDirection ?? "newestFirst";
  const orderBy: Prisma.multi_user_todo_todosOrderByWithRelationInput = (() => {
    const dir =
      sortDirection === "oldestFirst" || sortDirection === "earliestFirst"
        ? ("asc" as const)
        : ("desc" as const);
    if (sortBy === "createdAt") return { created_at: dir };
    if (sortBy === "startDate") return { start_date: dir };
    if (sortBy === "dueDate") return { due_date: dir };
    throw new HttpException("Invalid sort key", 400);
  })();
  const [records, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.multi_user_todo_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...MultiUserTodoTodoAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_todos.count({ where }),
  ]);
  return {
    pagination: {
      // IPagination in this project does not have `current`.
      page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as any,
    data: await ArrayUtil.asyncMap(
      records,
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
  };
}
