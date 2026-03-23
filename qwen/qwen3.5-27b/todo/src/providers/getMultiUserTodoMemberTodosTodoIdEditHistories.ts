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
import { MultiUserTodoTodoEditHistoryAtSummaryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPageIMultiUserTodoTodoEditHistory.ISummary> {
  // Verify the requesting member owns the todo
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
    },
    select: {
      id: true,
      multi_user_todo_member_id: true,
    },
  });
  // Query edit histories with pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const histories =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findMany({
      where: {
        multi_user_todo_todos_id: props.todoId,
      },
      skip,
      take: limit,
      orderBy: {
        edit_timestamp: "desc",
      },
      ...MultiUserTodoTodoEditHistoryAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.multi_user_todo_todo_edit_histories.count(
    {
      where: {
        multi_user_todo_todos_id: props.todoId,
      },
    },
  );
  const transformed = await ArrayUtil.asyncMap(
    histories,
    MultiUserTodoTodoEditHistoryAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformed,
  };
}
