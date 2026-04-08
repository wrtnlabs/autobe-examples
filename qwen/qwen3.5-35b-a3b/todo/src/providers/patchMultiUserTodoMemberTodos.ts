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
  const limit = props.body.limit ?? 20;
  const status = props.body.status ?? "all";
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.multi_user_todo_todosWhereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: null,
    is_deleted: false,
    ...((status !== "all" && {
      is_complete: status === "complete",
    }) as Prisma.multi_user_todo_todosWhereInput),
  };
  const orderByInput: Prisma.multi_user_todo_todosOrderByWithRelationInput[] = [
    {
      [sortBy]: sortOrder,
    },
  ];
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
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
      records,
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
  };
}
