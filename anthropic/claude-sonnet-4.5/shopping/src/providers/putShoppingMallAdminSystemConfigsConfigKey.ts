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

export async function putShoppingMallAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IShoppingMallSystemConfig.IUpdate;
}): Promise<IShoppingMallSystemConfig> {
  const existing = await MyGlobal.prisma.shopping_mall_system_configs.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!existing) {
    throw new HttpException("System configuration not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_system_configs.update({
    where: {
      id: existing.id,
    },
    data: {
      config_value: props.body.config_value,
      value_type: props.body.value_type,
      description: props.body.description,
      category: props.body.category,
      status: props.body.status,
      is_sensitive: props.body.is_sensitive,
    },
  });

  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    value_type: updated.value_type,
    description: updated.description,
    category: updated.category,
    status: updated.status,
    is_sensitive: updated.is_sensitive,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
