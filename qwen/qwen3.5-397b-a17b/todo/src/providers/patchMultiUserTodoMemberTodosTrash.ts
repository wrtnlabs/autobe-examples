import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
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

export async function patchMultiUserTodoMemberTodosTrash(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: { not: null },
    ...(props.body.status === "complete" && { completed_at: { not: null } }),
    ...(props.body.status === "incomplete" && { completed_at: null }),
  } satisfies Prisma.multi_user_todo_todosWhereInput;
  const orderByInput = (
    props.body.sortBy === "startedAt"
      ? {
          started_at: {
            sort: props.body.sortDirection === "desc" ? "desc" : "asc",
            nulls: "last",
          },
        }
      : props.body.sortBy === "dueAt"
        ? {
            due_at: {
              sort: props.body.sortDirection === "desc" ? "desc" : "asc",
              nulls: "last",
            },
          }
        : { created_at: props.body.sortDirection === "desc" ? "desc" : "asc" }
  ) satisfies Prisma.multi_user_todo_todosOrderByWithRelationInput;
  const data = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...MultiUserTodoTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
