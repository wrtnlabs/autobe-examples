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

export async function putTodoListAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
  body: ITodoListSystemConfig.IUpdate;
}): Promise<ITodoListSystemConfig> {
  // Fetch the config record that is not soft-deleted
  const existing = await MyGlobal.prisma.todo_list_system_configs.findFirst({
    where: {
      id: props.systemConfigId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("System config not found", 404);
  }

  // Prepare update data (only allow value/description from DTO)
  const { value, description } = props.body;
  const updatePayload: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
    ...(typeof value !== "undefined" && { value }),
    ...(typeof description !== "undefined" && { description }),
  };

  const updated = await MyGlobal.prisma.todo_list_system_configs.update({
    where: { id: props.systemConfigId },
    data: updatePayload,
  });

  // Ensure all fields match ITodoListSystemConfig type (null vs undefined per interface)
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description:
      typeof updated.description !== "undefined"
        ? updated.description
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
