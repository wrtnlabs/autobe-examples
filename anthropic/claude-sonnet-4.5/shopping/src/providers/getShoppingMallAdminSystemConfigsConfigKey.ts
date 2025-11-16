import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IShoppingMallSystemConfig> {
  const config = await MyGlobal.prisma.shopping_mall_system_configs.findFirst({
    where: {
      config_key: props.configKey,
    },
  });

  if (!config) {
    throw new HttpException("System configuration not found", 404);
  }

  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    value_type: config.value_type,
    description: config.description,
    category: config.category,
    status: config.status,
    is_sensitive: config.is_sensitive,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
