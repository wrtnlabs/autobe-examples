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

  return {
    id: configuration.id,
    config_key: configuration.config_key,
    name: configuration.name,
    description: configuration.description,
    data_type: configuration.data_type,
    default_value: configuration.default_value,
    validation_rules: configuration.validation_rules ?? undefined,
    category: configuration.category,
    is_sensitive: configuration.is_sensitive,
    is_required: configuration.is_required,
    version: configuration.version,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : undefined,
  };
}
