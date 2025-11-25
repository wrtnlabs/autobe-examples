import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminMallConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<void> {
  // Find the configuration by key (only if not already soft-deleted)
  const config = await MyGlobal.prisma.shopping_mall_configurations.findFirst({
    where: {
      config_key: props.configKey,
      deleted_at: null,
    },
  });

  if (!config) {
    throw new HttpException("Configuration not found or already deleted.", 404);
  }

  await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { config_key: props.configKey },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
