import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";

export async function putTodoConfigurationsId(props: {
  id: string & tags.Format<"uuid">;
  body: ITodoConfiguration.IUpdate;
}): Promise<ITodoConfiguration> {
  const { id, body } = props;

  // Check if configuration exists and is active (not deleted)
  const config = await MyGlobal.prisma.todo_configurations.findFirstOrThrow({
    where: {
      id,
      deleted_at: null,
    },
  });

  // Only allow updates for non-system configurations
  if (config.is_system === true) {
    throw new HttpException(
      "Unauthorized: Cannot modify system-level configurations",
      403,
    );
  }

  // Build update data conditionally
  const updateData = {
    ...(body.value !== undefined &&
      body.value !== null && { value: body.value }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.is_system !== undefined &&
      body.is_system !== null && {
        is_system: body.is_system,
      }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_configurationsUpdateInput;

  const updated = await MyGlobal.prisma.todo_configurations.update({
    where: { id },
    data: updateData,
  });

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
