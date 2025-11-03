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

export async function deleteTodoUserConfigurationsKey(props: {
  user: UserPayload;
  key: string;
}): Promise<ITodoConfiguration> {
  // Find configuration by key
  const configuration =
    await MyGlobal.prisma.todo_configurations.findFirstOrThrow({
      where: {
        key: props.key,
      },
    });

  // Check if already deleted
  if (configuration.deleted_at !== null) {
    throw new HttpException("Configuration is already deleted", 409);
  }

  // Update with deleted_at timestamp and update current timestamp
  const now = toISOStringSafe(new Date());
  const deleted = await MyGlobal.prisma.todo_configurations.update({
    where: {
      id: configuration.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    id: deleted.id as string & tags.Format<"uuid">,
    key: deleted.key,
    value: deleted.value,
    description: deleted.description,
    type: deleted.type,
    is_system: deleted.is_system,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  } satisfies ITodoConfiguration;
}
