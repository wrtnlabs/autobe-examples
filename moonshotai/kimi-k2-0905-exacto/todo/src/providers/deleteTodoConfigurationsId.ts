import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";

export async function deleteTodoConfigurationsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ITodoConfiguration> {
  const now = toISOStringSafe(new Date());

  // Use findUniqueOrThrow to handle non-existent configuration
  const config = await MyGlobal.prisma.todo_configurations
    .findUniqueOrThrow({
      where: { id: props.id },
    })
    .catch(() => {
      throw new HttpException("Configuration not found", 404);
    });

  // Soft delete the configuration
  const updated = await MyGlobal.prisma.todo_configurations.update({
    where: { id: props.id },
    data: { deleted_at: now },
  });

  // Return the soft deleted configuration
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key,
    value: updated.value,
    description: updated.description,
    type: updated.type,
    is_system: updated.is_system,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: toISOStringSafe(updated.deleted_at!),
  };
}
