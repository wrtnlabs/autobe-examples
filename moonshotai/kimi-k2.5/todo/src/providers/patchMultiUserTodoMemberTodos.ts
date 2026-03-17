import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const memberFilter: Prisma.multi_user_todo_todosWhereInput = {
    member_id: props.member.id,
  };
  const completionFilter: Prisma.multi_user_todo_todosWhereInput =
    props.body.isComplete !== undefined && props.body.isComplete !== null
      ? { is_complete: props.body.isComplete }
      : {};
  // Date range filters - build as Date objects for Prisma DateTime columns
  const startDateFilter: Prisma.multi_user_todo_todosWhereInput = {};
  const hasStartFrom =
    props.body.startFrom !== undefined && props.body.startFrom !== null;
  const hasStartTo =
    props.body.startTo !== undefined && props.body.startTo !== null;
  if (hasStartFrom || hasStartTo) {
    startDateFilter.start_date = {};
    if (hasStartFrom) {
      (
        startDateFilter.start_date as {
          gte?: Date;
        }
      ).gte = new Date(props.body.startFrom!);
    }
    if (hasStartTo) {
      (
        startDateFilter.start_date as {
          lte?: Date;
        }
      ).lte = new Date(props.body.startTo!);
    }
  }
  const dueDateFilter: Prisma.multi_user_todo_todosWhereInput = {};
  const hasDueFrom =
    props.body.dueFrom !== undefined && props.body.dueFrom !== null;
  const hasDueTo = props.body.dueTo !== undefined && props.body.dueTo !== null;
  if (hasDueFrom || hasDueTo) {
    dueDateFilter.due_date = {};
    if (hasDueFrom) {
      (
        dueDateFilter.due_date as {
          gte?: Date;
        }
      ).gte = new Date(props.body.dueFrom!);
    }
    if (hasDueTo) {
      (
        dueDateFilter.due_date as {
          lte?: Date;
        }
      ).lte = new Date(props.body.dueTo!);
    }
  }
  const deletedFilter: Prisma.multi_user_todo_todosWhereInput =
    props.body.showDeleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null };
  const searchFilter: Prisma.multi_user_todo_todosWhereInput =
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {};
  const where: Prisma.multi_user_todo_todosWhereInput = {
    ...memberFilter,
    ...completionFilter,
    ...startDateFilter,
    ...dueDateFilter,
    ...deletedFilter,
    ...searchFilter,
  };
  // Build orderBy
  const sortField = props.body.sortField ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByMapping: Record<
    NonNullable<IMultiUserTodoTodo.IRequest["sortField"]>,
    Prisma.multi_user_todo_todosOrderByWithRelationInput
  > = {
    createdAt: { created_at: sortOrder },
    updatedAt: { updated_at: sortOrder },
    startDate: { start_date: sortOrder },
    dueDate: { due_date: sortOrder },
    completedAt: { completed_at: sortOrder },
    title: { title: sortOrder },
  };
  const orderBy = orderByMapping[sortField] ?? { created_at: "desc" };
  // Execute queries sequentially for clarity
  const data = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...MultiUserTodoTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({ where });
  const transformed = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoTodoAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
