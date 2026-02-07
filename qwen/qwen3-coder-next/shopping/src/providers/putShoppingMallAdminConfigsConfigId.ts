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

export async function putShoppingMallAdminConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
  body: IShoppingMallSystematicConfig.IUpdate;
}): Promise<IShoppingMallSystematicConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configId },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  if (config.deleted_at !== null) {
    throw new HttpException("Configuration has been deleted", 404);
  }
  // IShoppingMallSystematicConfig.IUpdate is defined as empty type ({})
  // This implementation handles the case where no update data is available
  // The actual update functionality requires the DTO to be defined with the proper fields
  const updated = await MyGlobal.prisma.shopping_mall_systematic_configs.update(
    {
      where: { id: props.configId },
      data: {
        // No fields can be updated from empty IUpdate DTO
        // This is a limitation of the current DTO definition
        updated_at: new Date(),
      },
    },
  );
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
