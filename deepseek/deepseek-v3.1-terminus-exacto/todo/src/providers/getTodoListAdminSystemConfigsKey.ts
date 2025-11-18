import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<ITodoListSystemConfig> {
  const record = await MyGlobal.prisma.todo_list_system_configs.findUnique({
    where: {
      key: props.key,
    },
  });

  if (record === null) {
    throw new HttpException("System configuration not found", 404);
  }
  if (record.deleted_at !== null) {
    throw new HttpException("System configuration has been soft-deleted", 410);
  }

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
