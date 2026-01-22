import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserConfigurationsConfigurationId(props: {
  user: UserPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_app_configurations.findUnique({
    where: { id: props.configurationId },
    select: {
      id: true,
      user: { select: { id: true } },
    },
  });
  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }
  if (existing.user.id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own configurations",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_configurations.delete({
    where: { id: props.configurationId },
  });
}
