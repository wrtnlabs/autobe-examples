import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfig.ICreate;
}): Promise<IShoppingMallSystemConfig> {
  const created = await MyGlobal.prisma.shopping_mall_system_configs.create({
    data: {
      id: v4(),
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      value_type: props.body.value_type,
      description: props.body.description,
      category: props.body.category,
      status: props.body.status,
      is_sensitive: props.body.is_sensitive,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    value_type: created.value_type,
    description: created.description,
    category: created.category,
    status: created.status,
    is_sensitive: created.is_sensitive,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
