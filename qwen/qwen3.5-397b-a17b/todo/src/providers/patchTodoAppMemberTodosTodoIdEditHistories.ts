import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoEditHistory.IRequest;
}): Promise<IPageITodoAppTodoEditHistory.ISummary> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const created_atFilter: Prisma.DateTimeFilter | undefined =
    props.body.from || props.body.to
      ? {
          ...(props.body.from && { gte: new Date(props.body.from) }),
          ...(props.body.to && { lte: new Date(props.body.to) }),
        }
      : undefined;
  const whereInput: Prisma.todo_app_todo_edit_historiesWhereInput = {
    todo_app_todo_id: props.todoId,
    ...(created_atFilter && { created_at: created_atFilter }),
  };
  const orderByInput: Prisma.todo_app_todo_edit_historiesOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const records = await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoEditHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_edit_histories.count({
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
      TodoAppTodoEditHistoryAtSummaryTransformer.transform,
    ),
  } satisfies IPageITodoAppTodoEditHistory.ISummary;
}
