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

export async function deleteTodoListAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<ITodoListSystemConfig> {
  const id = props.systemConfigId;
  const config = await MyGlobal.prisma.todo_list_system_configs.findUnique({
    where: { id },
  });
  // Not found or already deleted
  if (!config || config.deleted_at !== null) {
    throw new HttpException(
      "System configuration not found or already archived.",
      404,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.todo_list_system_configs.update({
    where: { id },
    data: { deleted_at: now },
  });
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
