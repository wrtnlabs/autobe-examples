import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = typia.is<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >(props.body.limit)
    ? props.body.limit
    : 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: {
      not: null,
    },
  };
  const orderByInput: Prisma.todo_app_todosOrderByWithRelationInput = {
    deleted_at: "desc",
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...TodoAppTodoAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereInput,
    }),
  ]);
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> = Math.ceil(
    total / limit,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  };
}
