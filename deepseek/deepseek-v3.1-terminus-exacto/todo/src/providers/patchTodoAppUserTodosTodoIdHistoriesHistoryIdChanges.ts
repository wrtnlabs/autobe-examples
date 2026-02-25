import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryChange";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryChangeTransformer } from "../transformers/TodoAppTodoHistoryChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

interface LocalUserPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "user";
}
export async function patchTodoAppUserTodosTodoIdHistoriesHistoryIdChanges(props: {
  user: LocalUserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryChange.IRequest;
}): Promise<IPageITodoAppTodoHistoryChange> {
  // Validate ownership - ensure todo and history belong to user
  const history = await MyGlobal.prisma.todo_app_todo_histories.findFirst({
    where: {
      id: props.historyId,
      todo_app_user_id: props.user.id,
      todo_app_todo_id: props.todoId,
    },
    select: { id: true },
  });
  if (!history) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause without Date objects
  const whereInput: Prisma.todo_app_todo_history_changesWhereInput = {
    todo_app_todo_history_id: props.historyId,
  };
  // Add optional filters
  if (props.body.field_name) {
    whereInput.field_name = props.body.field_name;
  }
  if (props.body.created_at_from && props.body.created_at_to) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
      lte: new Date(props.body.created_at_to),
    };
  } else if (props.body.created_at_from) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  } else if (props.body.created_at_to) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  // Execute queries
  const data = await MyGlobal.prisma.todo_app_todo_history_changes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppTodoHistoryChangeTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_history_changes.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistoryChangeTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
