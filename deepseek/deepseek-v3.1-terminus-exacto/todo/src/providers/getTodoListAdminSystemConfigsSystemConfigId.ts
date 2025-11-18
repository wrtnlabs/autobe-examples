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

export async function getTodoListAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<ITodoListSystemConfig> {
  const record = await MyGlobal.prisma.todo_list_system_configs.findUnique({
    where: { id: props.systemConfigId },
  });

  if (!record) {
    throw new HttpException("System configuration not found.", 404);
  }

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description:
      typeof record.description === "undefined"
        ? undefined
        : record.description === null
          ? null
          : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      typeof record.deleted_at === "undefined"
        ? undefined
        : record.deleted_at === null
          ? null
          : toISOStringSafe(record.deleted_at),
  };
}
