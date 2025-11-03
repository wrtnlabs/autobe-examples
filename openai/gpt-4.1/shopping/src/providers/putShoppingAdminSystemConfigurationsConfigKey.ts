import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminSystemConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IShoppingSystemConfiguration.IUpdate;
}): Promise<IShoppingSystemConfiguration> {
  // Find configuration by config_key (case-insensitive)
  const config = await MyGlobal.prisma.shopping_system_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );
  if (!config) {
    throw new HttpException("System configuration not found", 404);
  }
  // Prepare update fields, only config_value and description are updatable
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_system_configurations.update({
    where: { id: config.id },
    data: {
      config_value: props.body.config_value,
      description:
        props.body.description !== undefined
          ? props.body.description
          : undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
