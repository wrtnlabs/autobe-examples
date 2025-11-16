import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserConfigurationsConfigurationKey(props: {
  user: UserPayload;
  configurationKey: string;
}): Promise<void> {
  // Verify the configuration exists
  const existingConfig =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: {
        key: props.configurationKey,
      },
    });

  if (!existingConfig) {
    throw new HttpException(
      `Configuration with key "${props.configurationKey}" not found`,
      404,
    );
  }

  // Perform the hard deletion
  await MyGlobal.prisma.todo_app_configurations.delete({
    where: {
      key: props.configurationKey,
    },
  });
}
