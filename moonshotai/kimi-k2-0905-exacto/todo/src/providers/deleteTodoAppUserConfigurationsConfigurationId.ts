import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function deleteTodoAppUserConfigurationsConfigurationId(props: {
  configurationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppConfiguration> {
  // Find the configuration to delete
  const configuration =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { id: props.configurationId },
    });

  if (!configuration) {
    throw new HttpException("System configuration not found", 404);
  }

  // Check if already soft-deleted (optional validation)
  if (configuration.deleted_at !== null) {
    throw new HttpException("System configuration already deleted", 410);
  }

  // Perform hard delete (permanent removal)
  const deletedConfiguration =
    await MyGlobal.prisma.todo_app_configurations.delete({
      where: { id: props.configurationId },
    });

  // Return the deleted configuration in ITodoAppConfiguration format
  return {
    id: deletedConfiguration.id,
    key: deletedConfiguration.key,
    value: deletedConfiguration.value,
    description: deletedConfiguration.description ?? null,
    category: deletedConfiguration.category ?? null,
    is_enabled: deletedConfiguration.is_enabled,
    created_at: toISOStringSafe(deletedConfiguration.created_at),
    updated_at: toISOStringSafe(deletedConfiguration.updated_at),
    deleted_at: deletedConfiguration.deleted_at
      ? toISOStringSafe(deletedConfiguration.deleted_at)
      : null,
  };
}
