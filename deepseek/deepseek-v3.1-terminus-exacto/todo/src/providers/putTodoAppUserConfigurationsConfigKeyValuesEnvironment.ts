import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserConfigurationsConfigKeyValuesEnvironment(props: {
  user: UserPayload;
  configKey: string;
  environment: string;
  body: ITodoAppConfigurationValue.IUpdate;
}): Promise<ITodoAppConfigurationValue> {
  // First, verify the configuration key exists
  const configuration =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { config_key: props.configKey, deleted_at: null },
    });

  if (!configuration) {
    throw new HttpException("Configuration key not found", 404);
  }

  // Find the existing configuration value for this environment
  const existingValue =
    await MyGlobal.prisma.todo_app_configuration_values.findFirst({
      where: {
        todo_app_configuration_id: configuration.id,
        environment: props.environment,
        deleted_at: null,
      },
    });

  if (!existingValue) {
    throw new HttpException(
      "Configuration value not found for the specified environment",
      404,
    );
  }

  // Validate value_type matches parent configuration data_type if provided
  if (
    props.body.value_type !== undefined &&
    props.body.value_type !== configuration.data_type
  ) {
    throw new HttpException(
      "Value type must match the parent configuration's data type",
      400,
    );
  }

  // Prepare update data
  const updateData: Prisma.todo_app_configuration_valuesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Apply updates from the request body
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }

  if (props.body.value_type !== undefined) {
    updateData.value_type = props.body.value_type;
  }

  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.todo_app_configuration_values.update({
    where: { id: existingValue.id },
    data: updateData,
  });

  // Return the updated configuration value
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
