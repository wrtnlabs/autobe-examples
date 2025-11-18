import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserSystemConfigurationsConfigKey(props: {
  user: UserPayload;
  configKey: string;
}): Promise<void> {
  // Verify configuration exists before deletion
  const existing = await MyGlobal.prisma.todo_list_system_config.findUnique({
    where: { config_key: props.configKey },
  });

  if (!existing) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  // Delete the configuration entry
  await MyGlobal.prisma.todo_list_system_config.delete({
    where: { id: existing.id },
  });
}
