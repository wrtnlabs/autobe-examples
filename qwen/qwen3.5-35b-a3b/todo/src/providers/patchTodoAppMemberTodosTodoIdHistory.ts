import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryAtSummaryTransformer } from "../transformers/TodoAppEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppEditHistory.IRequest;
}): Promise<IPageITodoAppEditHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      member_id: props.member.id,
      is_deleted: false,
    },
    select: { id: true },
  });
  const whereInput: Prisma.todo_app_edit_historiesWhereInput = {
    todo_app_todos_id: props.todoId,
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.previousTitle && {
      previous_title: {
        contains: props.body.previousTitle,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.newTitle && {
      new_title: {
        contains: props.body.newTitle,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.previousDescription && {
      previous_description: {
        contains: props.body.previousDescription,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.newDescription && {
      new_description: {
        contains: props.body.newDescription,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.previousStartDate && {
      previous_start_date: { equals: new Date(props.body.previousStartDate) },
    }),
    ...(props.body.newStartDate && {
      new_start_date: { equals: new Date(props.body.newStartDate) },
    }),
    ...(props.body.previousDueDate && {
      previous_due_date: { equals: new Date(props.body.previousDueDate) },
    }),
    ...(props.body.newDueDate && {
      new_due_date: { equals: new Date(props.body.newDueDate) },
    }),
  } satisfies Prisma.todo_app_edit_historiesWhereInput;
  const orderByInput: Prisma.todo_app_edit_historiesOrderByWithRelationInput = (
    props.body.sort === "createdAt-asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_edit_historiesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_edit_histories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoAppEditHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_edit_histories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppEditHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
