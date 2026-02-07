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

export async function patchShoppingMallSuperAdminConfigs(props: {
  superAdmin: SuperadminPayload;
  configKey: string & tags.Format<"uuid">;
  body: IShoppingMallSystematicConfig.IUpdate;
}): Promise<IShoppingMallSystematicConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configKey },
    });
  if (!config) {
    throw new HttpException("System configuration not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_mall_systematic_configs.update(
    {
      where: { id: props.configKey },
      data: {
        config_value: props.body.config_value,
        config_type: props.body.config_type,
        description: props.body.description,
        is_active: props.body.is_active,
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
