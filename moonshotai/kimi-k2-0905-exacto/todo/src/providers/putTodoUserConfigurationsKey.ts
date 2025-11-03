import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserConfigurationsKey(props: {
  user: UserPayload;
  key: string;
  body: ITodoConfiguration.IUpdate;
}): Promise<ITodoConfiguration> {
  const { user, key, body } = props;

  // Find the configuration by key to ensure it exists
  await MyGlobal.prisma.todo_configurations.findUniqueOrThrow({
    where: { key },
  });

  // Build update data - only include fields that are explicitly provided
  // Convert null values to undefined for Prisma compatibility
  const updateData = {
    ...(body.description !== undefined && {
      description: body.description ?? undefined,
    }),
    ...(body.is_system !== undefined && {
      is_system: body.is_system ?? undefined,
    }),
    ...(body.type !== undefined && {
      type: body.type ?? undefined,
    }),
    ...(body.value !== undefined && {
      value: body.value ?? undefined,
    }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_configurationsUpdateInput;

  // Update the configuration
  const updated = await MyGlobal.prisma.todo_configurations.update({
    where: { key },
    data: updateData,
  });

  // Return formatted response with proper type conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key,
    value: updated.value,
    description: updated.description,
    type: updated.type,
    is_system: updated.is_system,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies ITodoConfiguration;
}
