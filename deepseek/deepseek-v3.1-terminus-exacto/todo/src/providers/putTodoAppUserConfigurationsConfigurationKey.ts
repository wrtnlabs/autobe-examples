import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
  body: ITodoAppConfiguration.IUpdate;
}): Promise<ITodoAppConfiguration> {
  // Check if configuration exists
  const existing = await MyGlobal.prisma.todo_app_configurations.findUnique({
    where: { key: props.configurationKey },
  });

  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }

  // Prepare update data with proper date handling
  const updateData: Prisma.todo_app_configurationsUpdateInput = {
    ...(props.body.key !== undefined && { key: props.body.key }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.data_type !== undefined && {
      data_type: props.body.data_type,
    }),
    ...(props.body.category !== undefined && { category: props.body.category }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Update the configuration
  const updated = await MyGlobal.prisma.todo_app_configurations.update({
    where: { key: props.configurationKey },
    data: updateData,
  });

  // Return the updated configuration with proper type conversion
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    data_type: updated.data_type as IConfigurationDataType,
    category: updated.category,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
