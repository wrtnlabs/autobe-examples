import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoEditHistory.IRequest;
}): Promise<IPageIMultiUserTodoTodoEditHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
  });
  const whereInput = {
    multi_user_todo_todo_id: props.todoId,
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.multi_user_todo_todo_edit_historiesWhereInput;
  const data =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
      },
    });
  const total = await MyGlobal.prisma.multi_user_todo_todo_edit_histories.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (history) =>
        ({
          id: history.id as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(history.created_at),
          title: history.title ?? null,
          description: history.description ?? null,
          started_at: history.started_at
            ? toISOStringSafe(history.started_at)
            : null,
          due_at: history.due_at ? toISOStringSafe(history.due_at) : null,
        }) satisfies IMultiUserTodoTodoEditHistory.ISummary,
    ),
  } satisfies IPageIMultiUserTodoTodoEditHistory.ISummary;
}
