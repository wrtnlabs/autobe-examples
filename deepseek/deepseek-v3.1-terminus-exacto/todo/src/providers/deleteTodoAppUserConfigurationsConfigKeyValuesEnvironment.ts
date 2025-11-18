import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserConfigurationsConfigKeyValuesEnvironment(props: {
  user: UserPayload;
  configKey: string;
  environment: string;
}): Promise<ITodoAppConfigurationValue> {
  // First, verify the configuration key exists
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!configuration) {
    throw new HttpException(
      `Configuration key '${props.configKey}' not found`,
      404,
    );
  }

  // Find the environment-specific configuration value
  const configValue =
    await MyGlobal.prisma.todo_app_configuration_values.findFirst({
      where: {
        todo_app_configuration_id: configuration.id,
        environment: props.environment,
        deleted_at: null,
      },
    });

  if (!configValue) {
    throw new HttpException(
      `Configuration value for environment '${props.environment}' not found`,
      404,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  const updated = await MyGlobal.prisma.todo_app_configuration_values.update({
    where: { id: configValue.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the deleted configuration value
  return {
    id: updated.id,
    environment: updated.environment,
    config_value: updated.config_value,
    value_type: updated.value_type,
    is_active: updated.is_active,
    effective_to: updated.effective_to
      ? toISOStringSafe(updated.effective_to)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
