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

export async function patchShoppingMallAdminConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicConfig.IUpdate;
}): Promise<IShoppingMallSystematicConfig> {
  // The body parameter is typed as IUpdate, which may have a different structure
  // Use type assertion to access the required properties
  const updateBody = props.body as any;
  // Find existing configuration
  const existing =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { config_key: updateBody.config_key },
    });
  // Throw 404 if not found
  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }
  // Update the configuration
  const updated = await MyGlobal.prisma.shopping_mall_systematic_configs.update(
    {
      where: { config_key: existing.config_key },
      data: {
        config_value: updateBody.config_value,
        config_type: updateBody.config_type,
        description: updateBody.description,
        is_active: updateBody.is_active,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  // Return the updated configuration
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    config_type: updated.config_type,
    description: updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
