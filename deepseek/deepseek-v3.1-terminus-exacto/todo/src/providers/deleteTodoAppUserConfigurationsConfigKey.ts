import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppUserConfigurationsConfigKey(props: {
  configKey: string;
}): Promise<void> {
  // Verify configuration exists before deletion
  const existingConfig =
    await MyGlobal.prisma.todo_app_configurations.findUnique({
      where: { config_key: props.configKey },
    });

  if (!existingConfig) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  // Perform hard delete operation
  await MyGlobal.prisma.todo_app_configurations.delete({
    where: { config_key: props.configKey },
  });
}
