import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function getTodoAppConfigurationsConfigurationId(props: {
  configurationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppConfiguration> {
  const configuration =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { id: props.configurationId },
    });

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    id: configuration.id,
    key: configuration.key,
    value: configuration.value,
    description: configuration.description,
    category: configuration.category,
    is_enabled: configuration.is_enabled,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : undefined,
  };
}
