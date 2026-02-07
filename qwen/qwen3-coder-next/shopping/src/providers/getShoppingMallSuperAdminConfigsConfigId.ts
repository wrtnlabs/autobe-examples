import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminConfigsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string;
}): Promise<IShoppingMallSystematicConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configId },
      select: {
        id: true,
        config_key: true,
        config_value: true,
        config_type: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!config) {
    throw new HttpException("System configuration not found", 404);
  }
  if (config.deleted_at !== null) {
    throw new HttpException("System configuration has been deleted", 410);
  }
  return {
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
}
