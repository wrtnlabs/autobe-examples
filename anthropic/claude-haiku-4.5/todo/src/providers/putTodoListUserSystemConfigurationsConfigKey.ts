import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserSystemConfigurationsConfigKey(props: {
  user: UserPayload;
  configKey: string;
  body: ITodoListSystemConfiguration.IUpdate;
}): Promise<ITodoListSystemConfiguration> {
  const existing = await MyGlobal.prisma.todo_list_system_config.findUnique({
    where: { config_key: props.configKey },
  });

  if (!existing) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  const updated = await MyGlobal.prisma.todo_list_system_config.update({
    where: { config_key: props.configKey },
    data: {
      config_value: props.body.config_value,
      description: props.body.description,
      version: existing.version + 1,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    value_type: typia.assert<"string" | "boolean" | "float" | "integer">(
      updated.value_type,
    ),
    description: updated.description ?? undefined,
    version: updated.version,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
