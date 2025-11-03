import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";

export async function getTodoConfigurationsKey(props: {
  key: string;
}): Promise<ITodoConfiguration> {
  const configuration = await MyGlobal.prisma.todo_configurations.findFirst({
    where: {
      key: props.key,
      deleted_at: null,
    },
  });

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    id: configuration.id as string & tags.Format<"uuid">,
    key: configuration.key,
    value: configuration.value,
    description: configuration.description,
    type: configuration.type,
    is_system: configuration.is_system,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : null,
  };
}
