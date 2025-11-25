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

export async function getTodoAppAdminSystemMetadataConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  environment_scope: string;
}): Promise<ITodoAppSystemMetadata> {
  const metadata = await MyGlobal.prisma.todo_app_system_metadata.findUnique({
    where: {
      config_key_environment_scope: {
        config_key: props.configKey,
        environment_scope: props.environment_scope,
      },
    },
  });

  if (!metadata) {
    throw new HttpException("System metadata configuration not found", 404);
  }

  return {
    id: metadata.id,
    config_key: metadata.config_key,
    config_value: metadata.config_value,
    config_type: metadata.config_type,
    category: metadata.category,
    description: metadata.description,
    is_active: metadata.is_active,
    is_system_config: metadata.is_system_config,
    environment_scope: metadata.environment_scope,
    created_by_member_id: metadata.created_by_member_id ?? undefined,
    created_by_administrator_id:
      metadata.created_by_administrator_id ?? undefined,
    validation_schema: metadata.validation_schema,
    default_value: metadata.default_value,
    min_value: metadata.min_value,
    max_value: metadata.max_value,
    allowed_values: metadata.allowed_values,
    created_at: toISOStringSafe(metadata.created_at),
    updated_at: toISOStringSafe(metadata.updated_at),
    deleted_at: metadata.deleted_at
      ? toISOStringSafe(metadata.deleted_at)
      : undefined,
  };
}
