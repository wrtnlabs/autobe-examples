import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminMallConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IShoppingMallConfiguration> {
  const config = await MyGlobal.prisma.shopping_mall_configurations.findUnique({
    where: { config_key: props.configKey },
  });

  if (!config) {
    throw new HttpException("Configuration entry not found", 404);
  }

  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    description: config.description,
    status: typia.assert<"active" | "inactive" | "deprecated">(config.status),
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at:
      config.deleted_at === null ? null : toISOStringSafe(config.deleted_at),
  };
}
