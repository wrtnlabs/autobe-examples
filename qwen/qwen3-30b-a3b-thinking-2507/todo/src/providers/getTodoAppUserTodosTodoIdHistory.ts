import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppHistory";
import { ITodoAppHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppHistoryAtSummaryTransformer } from "../transformers/TodoAppHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistory(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPageITodoAppHistory.ISummary> {
  const { user, todoId } = props;
  // Verify user owns this todo
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: todoId,
      user_id: user.id,
    },
  });
  // Retrieve limited history entries (newest first) including the related todo
  const historyEntries = await MyGlobal.prisma.todo_app_histories.findMany({
    where: { todos_id: todoId },
    include: { todo: true },
    orderBy: { timestamp: "desc" },
    take: 20,
  });
  // Compute total history count
  const total = await MyGlobal.prisma.todo_app_histories.count({
    where: { todos_id: todoId },
  });
  // Transform history records
  const data = await Promise.all(
    historyEntries.map((entry) =>
      TodoAppHistoryAtSummaryTransformer.transform(entry),
    ),
  );
  return {
    data,
    pagination: {
      current: 1,
      limit: 20,
      records: total,
      pages: Math.ceil(total / 20),
    },
  };
}
