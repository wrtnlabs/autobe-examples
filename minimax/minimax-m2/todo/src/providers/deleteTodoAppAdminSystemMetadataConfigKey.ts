import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminSystemMetadataConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<ITodoAppSystemMetadata> {
  // Find the configuration entry by configKey
  const existing = await MyGlobal.prisma.todo_app_system_metadata.findFirst({
    where: {
      config_key: props.configKey,
      deleted_at: null, // Only find non-deleted entries
    },
  });

  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const updated = await MyGlobal.prisma.todo_app_system_metadata.update({
    where: {
      id: existing.id,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  // Return the soft-deleted record with proper date formatting
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    config_type: updated.config_type,
    category: updated.category,
    description: updated.description,
    is_active: updated.is_active,
    is_system_config: updated.is_system_config,
    environment_scope: updated.environment_scope,
    created_by_member_id: updated.created_by_member_id,
    created_by_administrator_id: updated.created_by_administrator_id,
    validation_schema: updated.validation_schema,
    default_value: updated.default_value,
    min_value: updated.min_value,
    max_value: updated.max_value,
    allowed_values: updated.allowed_values,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
