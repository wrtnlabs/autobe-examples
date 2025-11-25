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

export async function postTodoAppUserConfigurationsConfigurationIdValues(props: {
  user: UserPayload;
  configurationId: string & tags.Format<"uuid">;
  body: ITodoAppConfigurationValue.ICreate;
}): Promise<ITodoAppConfigurationValue> {
  // Verify configuration exists
  const configuration =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { id: props.configurationId, deleted_at: null },
    });

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  // Validate value type matches configuration data type
  if (configuration.data_type !== props.body.value_type) {
    throw new HttpException(
      `Value type ${props.body.value_type} does not match configuration data type ${configuration.data_type}`,
      400,
    );
  }

  // Check if value already exists for this environment
  const existingValue =
    await MyGlobal.prisma.todo_app_configuration_values.findFirst({
      where: {
        todo_app_configuration_id: props.configurationId,
        environment: props.body.environment,
        deleted_at: null,
      },
    });

  const now = toISOStringSafe(new Date());
  let result;

  if (existingValue) {
    // Update existing value
    result = await MyGlobal.prisma.todo_app_configuration_values.update({
      where: { id: existingValue.id },
      data: {
        config_value: props.body.config_value,
        value_type: props.body.value_type,
        is_active: props.body.is_active,
        effective_to: props.body.effective_to,
        updated_at: now,
      },
    });
  } else {
    // Create new value
    result = await MyGlobal.prisma.todo_app_configuration_values.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_configuration_id: props.configurationId,
        environment: props.body.environment,
        config_value: props.body.config_value,
        value_type: props.body.value_type,
        is_active: props.body.is_active,
        effective_from: now,
        effective_to: props.body.effective_to,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: result.id,
    environment: result.environment,
    config_value: result.config_value,
    value_type: result.value_type,
    is_active: result.is_active,
    effective_to: result.effective_to
      ? toISOStringSafe(result.effective_to)
      : undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
