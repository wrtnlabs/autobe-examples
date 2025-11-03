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

export async function getShoppingAdminSystemConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IShoppingSystemConfiguration> {
  // RBAC: presence of admin param is sufficient, further checks handled by decorator layer.
  const config = await MyGlobal.prisma.shopping_system_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );
  if (!config) {
    throw new HttpException("Configuration key not found", 404);
  }
  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    description: config.description ?? undefined,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at
      ? toISOStringSafe(config.deleted_at)
      : undefined,
  };
}
