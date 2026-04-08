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

export async function patchTodoAppMemberTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: { not: null },
    ...(props.body.completion_status !== undefined &&
      props.body.completion_status !== null && {
        completed: props.body.completion_status,
      }),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderByInput = (
    props.body.sort_field === "created_at"
      ? { created_at: props.body.sort_direction ?? ("desc" as const) }
      : props.body.sort_field === "start_date"
        ? { start_date: props.body.sort_direction ?? ("desc" as const) }
        : props.body.sort_field === "due_date"
          ? { due_date: props.body.sort_direction ?? ("desc" as const) }
          : { deleted_at: "desc" as const }
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  const records = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  };
}
