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

export async function patchMultiUserTodoMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.multi_user_todo_todosWhereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted: false,
  };
  if (props.body.search !== undefined && props.body.search !== "") {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.completed !== undefined && props.body.completed !== null) {
    whereInput.completed = props.body.completed;
  }
  if (
    props.body.startDateFrom !== undefined ||
    props.body.startDateTo !== undefined
  ) {
    whereInput.start_date = {
      ...(props.body.startDateFrom !== undefined
        ? { gte: new Date(props.body.startDateFrom) }
        : {}),
      ...(props.body.startDateTo !== undefined
        ? { lte: new Date(props.body.startDateTo) }
        : {}),
    };
  }
  if (
    props.body.dueDateFrom !== undefined ||
    props.body.dueDateTo !== undefined
  ) {
    whereInput.due_date = {
      ...(props.body.dueDateFrom !== undefined
        ? { gte: new Date(props.body.dueDateFrom) }
        : {}),
      ...(props.body.dueDateTo !== undefined
        ? { lte: new Date(props.body.dueDateTo) }
        : {}),
    };
  }
  const orderByInput: Prisma.multi_user_todo_todosOrderByWithRelationInput =
    props.body.sortBy !== undefined && props.body.sortOrder !== undefined
      ? {
          [props.body.sortBy]: props.body.sortOrder,
        }
      : { created_at: "desc" };
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
  } satisfies IPageIMultiUserTodoTodo.ISummary;
}
