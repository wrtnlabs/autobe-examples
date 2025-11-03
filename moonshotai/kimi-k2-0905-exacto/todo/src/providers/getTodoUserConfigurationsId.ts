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

export async function getTodoUserConfigurationsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoConfiguration> {
  const config = await MyGlobal.prisma.todo_configurations.findUnique({
    where: {
      id: props.id,
      deleted_at: null, // Only return non-deleted configurations
    },
    select: {
      id: true,
      key: true,
      value: true,
      description: true,
      type: true,
      is_system: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    id: config.id as string & tags.Format<"uuid">,
    key: config.key,
    value: config.value,
    description: config.description,
    type: config.type,
    is_system: config.is_system,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
