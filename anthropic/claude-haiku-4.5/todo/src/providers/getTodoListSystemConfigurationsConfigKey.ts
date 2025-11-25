import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function getTodoListSystemConfigurationsConfigKey(props: {
  configKey: string;
}): Promise<ITodoListSystemConfig> {
  const config = await MyGlobal.prisma.todo_list_system_config.findUnique({
    where: {
      config_key: props.configKey,
    },
  });

  if (!config) {
    throw new HttpException(
      `System configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    value_type: typia.assert<"string" | "boolean" | "float" | "integer">(
      config.value_type,
    ),
    description: config.description === null ? undefined : config.description,
    version: config.version,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
  };
}
