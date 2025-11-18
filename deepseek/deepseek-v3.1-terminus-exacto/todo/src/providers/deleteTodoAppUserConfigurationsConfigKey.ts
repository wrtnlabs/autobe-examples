import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserConfigurationsConfigKey(props: {
  user: UserPayload;
  configKey: string;
}): Promise<void> {
  // First, verify the configuration exists
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  // Check if there are any active configuration values
  const activeValues =
    await MyGlobal.prisma.todo_app_configuration_values.findFirst({
      where: {
        todo_app_configuration_id: configuration.id,
        is_active: true,
        deleted_at: null,
      },
    });

  if (activeValues) {
    throw new HttpException(
      "Cannot delete configuration with active values",
      400,
    );
  }

  // Use transaction to ensure atomic deletion of related records
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const now = toISOStringSafe(new Date());

    // Delete configuration values (hard delete since they depend on the configuration)
    await prisma.todo_app_configuration_values.deleteMany({
      where: {
        todo_app_configuration_id: configuration.id,
      },
    });

    // Configuration snapshots are historical records and should be preserved
    // They don't have a deleted_at field and should remain for audit purposes

    // Soft delete the main configuration
    await prisma.todo_app_configurations.update({
      where: {
        id: configuration.id,
      },
      data: {
        deleted_at: now,
      },
    });
  });
}
