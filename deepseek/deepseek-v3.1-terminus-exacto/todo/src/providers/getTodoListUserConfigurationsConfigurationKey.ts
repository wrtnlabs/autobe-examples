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

export async function getTodoListUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
}): Promise<ITodoListConfiguration> {
  const configuration =
    await MyGlobal.prisma.todo_list_configurations.findFirst({
      where: {
        key: props.configurationKey,
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
    description: configuration.description ?? undefined,
    category: configuration.category ?? undefined,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : undefined,
  };
}
