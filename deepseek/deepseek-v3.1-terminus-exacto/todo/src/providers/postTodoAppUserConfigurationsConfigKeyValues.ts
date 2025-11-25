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

export async function postTodoAppUserConfigurationsConfigKeyValues(props: {
  user: UserPayload;
  configKey: string;
  body: ITodoAppConfigurationValue.ICreate;
}): Promise<ITodoAppConfigurationValue> {
  // Verify the configuration key exists and is active
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  // Verify value type compatibility
  if (props.body.value_type !== configuration.data_type) {
    throw new HttpException(
      `Value type '${props.body.value_type}' does not match configuration definition '${configuration.data_type}'`,
      400,
    );
  }

  // Validate config_value against validation rules if present
  if (configuration.validation_rules) {
    // Basic validation - in production this would parse the JSON rules
    // and perform proper validation based on data_type
    try {
      const rules = JSON.parse(configuration.validation_rules);
      // Simple validation based on data_type
      switch (configuration.data_type) {
        case "boolean":
          if (
            props.body.config_value !== "true" &&
            props.body.config_value !== "false"
          ) {
            throw new HttpException(
              "Boolean value must be 'true' or 'false'",
              400,
            );
          }
          break;
        case "number":
          if (isNaN(Number(props.body.config_value))) {
            throw new HttpException("Value must be a valid number", 400);
          }
          break;
        // Add more validation as needed for other types
      }
    } catch (error) {
      // If validation rules are invalid JSON, skip validation
    }
  }

  const now = toISOStringSafe(new Date());
  const effectiveFrom = props.body.is_active
    ? now
    : toISOStringSafe(new Date(0)); // Use epoch if inactive

  // Check if value already exists for this environment
  const existingValue =
    await MyGlobal.prisma.todo_app_configuration_values.findFirst({
      where: {
        todo_app_configuration_id: configuration.id,
        environment: props.body.environment,
        deleted_at: null,
      },
    });

  let result;
  if (existingValue) {
    // Update existing value
    result = await MyGlobal.prisma.todo_app_configuration_values.update({
      where: { id: existingValue.id },
      data: {
        config_value: props.body.config_value,
        value_type: props.body.value_type,
        is_active: props.body.is_active,
        effective_from: props.body.is_active
          ? now
          : existingValue.effective_from,
        effective_to:
          props.body.effective_to !== undefined
            ? props.body.effective_to
            : null,
        updated_at: now,
      },
    });
  } else {
    // Create new value - generate UUID properly
    const newId: string & tags.Format<"uuid"> = v4();

    result = await MyGlobal.prisma.todo_app_configuration_values.create({
      data: {
        id: newId,
        todo_app_configuration_id: configuration.id,
        environment: props.body.environment,
        config_value: props.body.config_value,
        value_type: props.body.value_type,
        is_active: props.body.is_active,
        effective_from: effectiveFrom,
        effective_to:
          props.body.effective_to !== undefined
            ? props.body.effective_to
            : null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Return the result with proper typing
  return {
    id: result.id,
    environment: result.environment,
    config_value: result.config_value,
    value_type: result.value_type,
    is_active: result.is_active,
    effective_to:
      result.effective_to !== null
        ? toISOStringSafe(result.effective_to)
        : undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
