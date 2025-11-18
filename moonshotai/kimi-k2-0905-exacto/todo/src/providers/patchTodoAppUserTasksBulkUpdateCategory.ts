import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppTaskUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskUpdateResult";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasksBulkUpdateCategory(props: {
  user: UserPayload;
  body: ITodoAppTask.IBulkUpdateCategory;
}): Promise<ITodoAppTaskUpdateResult> {
  // Verify the target category exists and belongs to the user
  const category = await MyGlobal.prisma.todo_app_categories.findUnique({
    where: {
      id: props.body.todo_app_category_id,
      todo_app_user_id: props.user.id,
    },
  });

  if (!category) {
    throw new HttpException(
      "Category not found or does not belong to user",
      404,
    );
  }

  // Verify all task IDs exist and belong to the user
  const tasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      id: { in: props.body.task_ids },
      todo_app_user_id: props.user.id,
    },
  });

  if (tasks.length !== props.body.task_ids.length) {
    throw new HttpException(
      "Some tasks not found or do not belong to user",
      404,
    );
  }

  // Perform bulk update operation
  const result = await MyGlobal.prisma.todo_app_tasks.updateMany({
    where: {
      id: { in: props.body.task_ids },
      todo_app_user_id: props.user.id,
    },
    data: {
      todo_app_category_id: props.body.todo_app_category_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    updatedTaskCount: result.count,
    success: true,
    message: `Successfully updated ${result.count} task(s) to category '${category.name}'`,
  };
}
