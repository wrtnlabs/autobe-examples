import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditAtSummaryTransformer } from "../transformers/TodoAppTodoEditAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoEdit.IRequest;
}): Promise<IPageITodoAppTodoEdit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_app_todo_editsWhereInput = {
    todo_id: props.todoId,
    todo: {
      todo_app_user_id: props.member.id,
    },
    ...(props.body.edited_at_min && {
      edited_at: {
        gte: new Date(props.body.edited_at_min),
      },
    }),
    ...(props.body.edited_at_max && {
      edited_at: {
        lte: new Date(props.body.edited_at_max),
      },
    }),
  } satisfies Prisma.todo_app_todo_editsWhereInput;
  const data = await MyGlobal.prisma.todo_app_todo_edits.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppTodoEditAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_edits.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoEditAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppTodoEdit.ISummary;
}
