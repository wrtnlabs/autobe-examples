import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
}): Promise<void> {
  // Check if configuration exists
  const existingConfig =
    await MyGlobal.prisma.todo_list_configurations.findFirst({
      where: {
        key: props.configurationKey,
      },
    });

  if (!existingConfig) {
    throw new HttpException("Configuration not found", 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.todo_list_configurations.delete({
    where: {
      key: props.configurationKey,
    },
  });
}
