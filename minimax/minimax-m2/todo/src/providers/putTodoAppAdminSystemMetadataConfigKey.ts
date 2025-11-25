import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminSystemMetadataConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: ITodoAppSystemMetadata.IUpdate;
}): Promise<ITodoAppSystemMetadata> {
  // First, find the existing configuration by configKey
  const existing = await MyGlobal.prisma.todo_app_system_metadata.findFirst({
    where: {
      config_key: props.configKey,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("System metadata configuration not found", 404);
  }

  // Build update data - only include fields that are provided in the body
  const updateData: Prisma.todo_app_system_metadataUpdateInput = {
    ...(props.body.config_value !== undefined && {
      config_value: props.body.config_value,
    }),
    ...(props.body.config_type !== undefined && {
      config_type: props.body.config_type,
    }),
    ...(props.body.category !== undefined && { category: props.body.category }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.is_system_config !== undefined && {
      is_system_config: props.body.is_system_config,
    }),
    ...(props.body.environment_scope !== undefined && {
      environment_scope: props.body.environment_scope,
    }),
    ...(props.body.validation_schema !== undefined && {
      validation_schema: props.body.validation_schema,
    }),
    ...(props.body.default_value !== undefined && {
      default_value: props.body.default_value,
    }),
    ...(props.body.min_value !== undefined && {
      min_value: props.body.min_value,
    }),
    ...(props.body.max_value !== undefined && {
      max_value: props.body.max_value,
    }),
    ...(props.body.allowed_values !== undefined && {
      allowed_values: props.body.allowed_values,
    }),
    updated_at: new Date(),
  };

  // Update the configuration
  const updated = await MyGlobal.prisma.todo_app_system_metadata.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Return the updated metadata with proper type handling
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
    created_by_member_id:
      updated.created_by_member_id === null
        ? undefined
        : updated.created_by_member_id,
    created_by_administrator_id:
      updated.created_by_administrator_id === null
        ? undefined
        : updated.created_by_administrator_id,
    validation_schema:
      updated.validation_schema === null
        ? undefined
        : updated.validation_schema,
    default_value:
      updated.default_value === null ? undefined : updated.default_value,
    min_value: updated.min_value === null ? undefined : updated.min_value,
    max_value: updated.max_value === null ? undefined : updated.max_value,
    allowed_values:
      updated.allowed_values === null ? undefined : updated.allowed_values,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
