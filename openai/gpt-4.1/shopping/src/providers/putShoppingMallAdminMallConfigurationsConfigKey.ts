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

export async function putShoppingMallAdminMallConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IShoppingMallConfiguration.IUpdate;
}): Promise<IShoppingMallConfiguration> {
  // Find the configuration by configKey, ensure not soft-deleted
  const config = await MyGlobal.prisma.shopping_mall_configurations.findFirst({
    where: {
      config_key: props.configKey,
      deleted_at: null,
    },
  });

  if (!config) {
    throw new HttpException(
      "Configuration entry not found or already deleted",
      404,
    );
  }

  // Update the configuration fields, including updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: config.id },
    data: {
      config_value: props.body.config_value,
      description: props.body.description,
      status: props.body.status,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description: updated.description,
    status: updated.status as "active" | "inactive" | "deprecated",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // Respect null/undefined contract for deleted_at (optional+nullable)
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
