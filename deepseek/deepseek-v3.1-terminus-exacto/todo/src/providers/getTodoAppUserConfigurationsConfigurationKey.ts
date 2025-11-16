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

export async function getTodoAppUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
}): Promise<ITodoAppConfiguration> {
  const configuration =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: {
        key: props.configurationKey,
      },
    });

  if (!configuration) {
    throw new HttpException(
      `Configuration with key '${props.configurationKey}' not found`,
      404,
    );
  }

  return {
    id: configuration.id,
    key: configuration.key,
    value: configuration.value,
    description: configuration.description ?? undefined,
    data_type: configuration.data_type as IConfigurationDataType,
    category: configuration.category,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
  };
}
