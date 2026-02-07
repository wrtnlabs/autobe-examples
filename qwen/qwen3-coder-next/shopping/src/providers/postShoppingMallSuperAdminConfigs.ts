import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSystematicConfigCollector } from "../collectors/ShoppingMallSystematicConfigCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminConfigs(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSystematicConfig.ICreate;
}): Promise<IShoppingMallSystematicConfig> {
  const created = await MyGlobal.prisma.shopping_mall_systematic_configs.create(
    {
      data: await ShoppingMallSystematicConfigCollector.collect({
        body: props.body,
      }),
    },
  );
  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    config_type: created.config_type,
    description: created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  } satisfies IShoppingMallSystematicConfig;
}
