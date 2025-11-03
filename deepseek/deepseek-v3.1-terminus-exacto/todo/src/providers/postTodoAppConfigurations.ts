import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function postTodoAppConfigurations(props: {
  body: ITodoAppConfiguration.ICreate;
}): Promise<ITodoAppConfiguration> {
  const { body } = props;

  // Check if config_key already exists
  const existingConfig =
    await MyGlobal.prisma.todo_app_configurations.findFirst({
      where: {
        config_key: body.config_key,
      },
    });

  if (existingConfig) {
    throw new HttpException("Configuration key already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_app_configurations.create({
    data: {
      id: v4(),
      config_key: body.config_key,
      config_value: body.config_value,
      data_type: body.data_type,
      description: body.description,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    data_type: typia.assert<"string" | "number" | "boolean" | "json">(
      created.data_type,
    ),
    description: created.description,
    status: typia.assert<"active" | "disabled" | "deprecated">(created.status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies ITodoAppConfiguration;
}
