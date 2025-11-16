import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

export async function getTodoAppTodoStatusesStatusCode(props: {
  statusCode: string;
}): Promise<ITodoAppTodoStatus> {
  const status = await MyGlobal.prisma.todo_app_todo_statuses.findUnique({
    where: { code: props.statusCode },
  });

  if (!status) {
    throw new HttpException(
      `Todo status not found for code: ${props.statusCode}`,
      404,
    );
  }

  return {
    id: status.id,
    code: status.code,
    label: status.label,
    description: status.description ?? null,
    group: status.group ?? null,
    sort_order: status.sort_order,
    is_default: status.is_default,
    is_active: status.is_active,
    created_at: toISOStringSafe(status.created_at),
    updated_at: toISOStringSafe(status.updated_at),
    deleted_at: status.deleted_at ? toISOStringSafe(status.deleted_at) : null,
  };
}
