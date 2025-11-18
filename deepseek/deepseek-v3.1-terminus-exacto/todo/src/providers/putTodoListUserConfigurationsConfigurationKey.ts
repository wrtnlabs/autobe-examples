import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodolistUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
  body: ITodoListConfiguration.IUpdate;
}): Promise<ITodoListConfiguration> {
  // Find existing configuration by key
  const existing = await MyGlobal.prisma.todo_list_configurations.findFirst({
    where: {
      key: props.configurationKey,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }

  // Update the configuration with only provided fields
  const updated = await MyGlobal.prisma.todo_list_configurations.update({
    where: { id: existing.id },
    data: {
      ...(props.body.value !== undefined && { value: props.body.value }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category !== undefined && {
        category: props.body.category,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated configuration with proper type conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    category: updated.category ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
