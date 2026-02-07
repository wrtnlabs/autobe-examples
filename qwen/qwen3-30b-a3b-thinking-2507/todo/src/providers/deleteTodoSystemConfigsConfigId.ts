import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoSystemConfigsConfigId(props: {
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const config = await MyGlobal.prisma.todo_system_configs.findUnique({
    where: { id: props.configId },
    select: { id: true, deleted_at: true },
  });
  if (!config) {
    throw new HttpException("System config not found", 404);
  }
  if (config.deleted_at) {
    throw new HttpException("System config already soft-deleted", 400);
  }
  await MyGlobal.prisma.todo_system_configs.update({
    where: { id: props.configId },
    data: { deleted_at: new Date() },
  });
}
