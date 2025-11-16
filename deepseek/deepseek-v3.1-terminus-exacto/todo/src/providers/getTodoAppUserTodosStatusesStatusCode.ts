import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosStatusesStatusCode(props: {
  user: UserPayload;
  statusCode: string;
}): Promise<ITodoAppTodoStatus> {
  const status = await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
    where: {
      code: props.statusCode,
      is_active: true,
    },
  });

  if (!status) {
    throw new HttpException("Todo status not found or inactive", 404);
  }

  return {
    id: status.id,
    code: status.code,
    name: status.name,
    description: status.description ?? undefined,
    is_active: status.is_active,
    created_at: toISOStringSafe(status.created_at),
  };
}
