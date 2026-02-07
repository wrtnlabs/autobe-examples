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

export async function postShoppingMallAdminConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicConfig.ICreate;
}): Promise<IShoppingMallSystematicConfig> {
  const created = await MyGlobal.prisma.shopping_mall_systematic_configs.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        config_key: "",
        config_value: "",
        config_type: "",
        description: "",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      } satisfies Prisma.shopping_mall_systematic_configsCreateInput,
    },
  );
  return {
    id: created.id as string & tags.Format<"uuid">,
    config_key: created.config_key,
    config_value: created.config_value,
    config_type: created.config_type,
    description: created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
