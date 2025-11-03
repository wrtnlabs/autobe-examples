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

export async function getShoppingMallAdminPlatformConfigsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPlatformConfig> {
  const found = await MyGlobal.prisma.shopping_mall_platform_configs.findFirst({
    where: {
      id: props.id,
      deleted_at: null,
    },
  });

  if (!found) {
    throw new HttpException(
      `Platform Config with id ${props.id} not found`,
      404,
    );
  }

  return {
    id: found.id,
    config_name: found.config_name,
    config_value: found.config_value,
    description: found.description ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
