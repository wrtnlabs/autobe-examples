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

export async function postTodoListAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ITodoListSystemConfig.ICreate;
}): Promise<ITodoListSystemConfig> {
  // Uniqueness check for 'key', including only not-deleted records
  const exists = await MyGlobal.prisma.todo_list_system_configs.findFirst({
    where: {
      key: props.body.key,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException("System configuration key already exists.", 409);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.todo_list_system_configs.create({
    data: {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
