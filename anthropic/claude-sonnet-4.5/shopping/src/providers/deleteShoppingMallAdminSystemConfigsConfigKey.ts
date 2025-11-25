import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IShoppingMallSystemConfig> {
  const existing =
    await MyGlobal.prisma.shopping_mall_system_configs.findUnique({
      where: { config_key: props.configKey },
    });

  if (!existing) {
    throw new HttpException("System configuration not found", 404);
  }

  const deleted = await MyGlobal.prisma.shopping_mall_system_configs.delete({
    where: { config_key: props.configKey },
  });

  return {
    id: deleted.id,
    config_key: deleted.config_key,
    config_value: deleted.config_value,
    value_type: deleted.value_type,
    description: deleted.description,
    category: deleted.category,
    status: deleted.status,
    is_sensitive: deleted.is_sensitive,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
