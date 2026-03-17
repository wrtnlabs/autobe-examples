import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/MultiUserTodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPageIMultiUserTodoAppTodoEditHistory.ISummary> {
  // Verify todo exists and belongs to member (returns 404 if not found or not owned)
  await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId, user_id: props.member.id },
    select: { id: true },
  });
  // Default pagination values
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  // Fetch paginated edit history and total count
  const [historyEntries, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.findMany({
      where: { todo_id: props.todoId },
      skip,
      take: limit,
      orderBy: { edited_at: "desc" as const },
      ...MultiUserTodoAppTodoEditHistoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.count({
      where: { todo_id: props.todoId },
    }),
  ]);
  const pages: number = Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      historyEntries,
      MultiUserTodoAppTodoEditHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIMultiUserTodoAppTodoEditHistory.ISummary;
}
