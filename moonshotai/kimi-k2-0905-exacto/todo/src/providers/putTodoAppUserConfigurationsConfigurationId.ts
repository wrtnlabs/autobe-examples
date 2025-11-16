import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function putTodoAppUserConfigurationsConfigurationId(props: {
  configurationId: string & tags.Format<"uuid">;
  body: ITodoAppConfiguration.IUpdate;
}): Promise<ITodoAppConfiguration> {
  // Check if configuration exists
  const existingConfig =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { id: props.configurationId },
    });

  if (!existingConfig) {
    throw new HttpException("Configuration not found", 404);
  }

  // Handle key uniqueness validation if key is being updated
  if (props.body.key !== undefined) {
    const keyExists = await MyGlobal.prisma.todo_app_configurations.findFirst({
      where: {
        key: props.body.key,
        id: { not: props.configurationId },
        deleted_at: null,
      },
    });

    if (keyExists) {
      throw new HttpException("Configuration key already exists", 409);
    }
  }

  const now = new Date();

  // Update configuration with provided data
  const updatedConfig = await MyGlobal.prisma.todo_app_configurations.update({
    where: { id: props.configurationId },
    data: {
      ...(props.body.key !== undefined && { key: props.body.key }),
      ...(props.body.value !== undefined && { value: props.body.value }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category !== undefined && {
        category: props.body.category,
      }),
      ...(props.body.is_enabled !== undefined && {
        is_enabled: props.body.is_enabled,
      }),
      ...(props.body.deleted_at !== undefined && {
        deleted_at: props.body.deleted_at,
      }),
      ...(props.body.updated_at !== undefined && {
        updated_at: props.body.updated_at,
      }),
      updated_at: now,
    },
  });

  // Return the updated configuration with proper type formatting
  return {
    id: updatedConfig.id as string & tags.Format<"uuid">,
    key: updatedConfig.key,
    value: updatedConfig.value,
    description: updatedConfig.description ?? undefined,
    category: updatedConfig.category ?? undefined,
    is_enabled: updatedConfig.is_enabled,
    created_at: toISOStringSafe(updatedConfig.created_at),
    updated_at: toISOStringSafe(updatedConfig.updated_at),
    deleted_at: updatedConfig.deleted_at
      ? toISOStringSafe(updatedConfig.deleted_at)
      : undefined,
  };
}
