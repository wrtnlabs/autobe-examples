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
import { TodoAppTodoEditTransformer } from "../transformers/TodoAppTodoEditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageITodoAppTodoEdit> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const data = await MyGlobal.prisma.todo_app_todo_edits.findMany({
    where: { todo_id: props.todoId },
    orderBy: { edited_at: "desc" },
    skip,
    take: limit,
    ...TodoAppTodoEditTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_edits.count({
    where: { todo_id: props.todoId },
  });
  return {
    data: await ArrayUtil.asyncMap(data, TodoAppTodoEditTransformer.transform),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
