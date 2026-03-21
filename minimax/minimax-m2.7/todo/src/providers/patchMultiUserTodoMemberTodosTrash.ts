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
  query: {
    page?: number;
    limit?: number;
    sortBy?: "created_at" | "start_date" | "due_date";
    sortOrder?: "asc" | "desc";
  };
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.query.page ?? 1;
  const limit = Math.min(props.query.limit ?? 20, 100);
  const sortBy = props.query.sortBy ?? "created_at";
  const sortOrder = props.query.sortOrder ?? "desc";
  const skip = (page - 1) * limit;
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: { not: null } as const,
  } satisfies Prisma.multi_user_todo_todosWhereInput;
  const data = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ [sortBy]: sortOrder }],
    ...MultiUserTodoTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
  };
}
