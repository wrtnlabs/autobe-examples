import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function postTodoListSystemConfigurations(props: {
  body: ITodoListSystemConfig.ICreate;
}): Promise<ITodoListSystemConfig> {
  // Check if config_key already exists (unique constraint)
  const existing = await MyGlobal.prisma.todo_list_system_config.findUnique({
    where: { config_key: props.body.config_key },
  });

  if (existing) {
    throw new HttpException(
      `Configuration key '${props.body.config_key}' already exists`,
      409,
    );
  }

  // Create new system configuration entry with version 1 and current timestamp
  const now = new Date();
  const created = await MyGlobal.prisma.todo_list_system_config.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      value_type: props.body.value_type,
      description: props.body.description ?? null,
      version: 1,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  // Return response with proper type conversions
  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    value_type: typia.assert<"string" | "boolean" | "float" | "integer">(
      created.value_type,
    ),
    description: created.description === null ? undefined : created.description,
    version: created.version,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
