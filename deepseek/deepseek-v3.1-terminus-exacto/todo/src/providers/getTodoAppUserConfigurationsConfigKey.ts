import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserConfigurationsConfigKey(props: {
  user: UserPayload;
  configKey: string;
}): Promise<ITodoAppConfiguration> {
  const { user, configKey } = props;

  // Find the configuration by its unique key
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: configKey,
      },
    },
  );

  // If configuration not found, throw 404 error
  if (!configuration) {
    throw new HttpException(
      `Configuration with key '${configKey}' not found`,
      404,
    );
  }

  // Return the configuration with proper typing
  return {
    id: configuration.id,
    config_key: configuration.config_key,
    config_value: configuration.config_value,
    data_type: typia.assert<"string" | "number" | "boolean" | "json">(
      configuration.data_type,
    ),
    description: configuration.description,
    status: typia.assert<"active" | "disabled" | "deprecated">(
      configuration.status,
    ),
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
  } satisfies ITodoAppConfiguration;
}
