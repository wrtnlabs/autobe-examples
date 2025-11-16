import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function deleteTodoAppTodoAdminTodoStatusesStatusCode(props: {
  todoAdmin: TodoadminPayload;
  statusCode: string;
}): Promise<void> {
  // Step 1: find the target status by its business code
  const existing = await MyGlobal.prisma.todo_app_todo_statuses.findUnique({
    where: {
      code: props.statusCode,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo status not found", 404);
  }

  // Step 2: enforce business rules
  // - Default statuses cannot be deprecated
  if (existing.is_default === true) {
    throw new HttpException(
      "Default Todo status cannot be deprecated while configured as default",
      400,
    );
  }

  // - Already inactive statuses are considered already deprecated
  if (existing.is_active === false) {
    throw new HttpException("Todo status is already deprecated", 400);
  }

  // Step 3: logically deprecate the status by marking it inactive
  await MyGlobal.prisma.todo_app_todo_statuses.update({
    where: {
      code: props.statusCode,
    },
    data: {
      is_active: false,
    },
  });
}
