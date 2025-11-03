import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function putTodoAppConfigurationsConfigKey(props: {
  configKey: string;
  body: ITodoAppConfiguration.IUpdate;
}): Promise<ITodoAppConfiguration> {
  const { configKey, body } = props;

  // Find existing configuration by config_key
  const existing = await MyGlobal.prisma.todo_app_configurations.findUnique({
    where: { config_key: configKey },
  });

  if (!existing) {
    throw new HttpException(
      `Configuration with key '${configKey}' not found`,
      404,
    );
  }

  // Prepare update data with current timestamp
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.config_key !== undefined && { config_key: body.config_key }),
    ...(body.config_value !== undefined && { config_value: body.config_value }),
    ...(body.data_type !== undefined && { data_type: body.data_type }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.status !== undefined && { status: body.status }),
    updated_at: now,
  } satisfies Prisma.todo_app_configurationsUpdateInput;

  // Update the configuration
  const updated = await MyGlobal.prisma.todo_app_configurations.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Convert all DateTime fields to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    config_key: updated.config_key,
    config_value: updated.config_value,
    data_type: updated.data_type as "string" | "boolean" | "number" | "json",
    description: updated.description,
    status: updated.status as "active" | "disabled" | "deprecated",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  } satisfies ITodoAppConfiguration;
}
