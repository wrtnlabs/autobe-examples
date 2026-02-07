import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
}): Promise<IShoppingMallSystematicConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configId },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  const response: IShoppingMallSystematicConfig = {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    config_type: config.config_type,
    description: config.description,
    is_active: config.is_active,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
  return response;
}
