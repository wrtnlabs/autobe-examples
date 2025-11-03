import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminPlatformConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallPlatformConfig.ICreate;
}): Promise<IShoppingMallPlatformConfig> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_platform_configs.create({
    data: {
      id,
      config_name: body.config_name,
      config_value: body.config_value,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    config_name: created.config_name,
    config_value: created.config_value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
