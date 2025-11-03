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

export async function putShoppingMallAdminPlatformConfigsId(props: {
  admin: AdminPayload;
  id: string;
  body: IShoppingMallPlatformConfig.IUpdate;
}): Promise<IShoppingMallPlatformConfig> {
  const { admin, id, body } = props;

  // Ensure the record exists and is not soft deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_platform_configs.findUnique({
      where: { id },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Platform configuration not found", 404);
  }

  // Check uniqueness of config_name, excluding current id, among non-deleted
  const conflict =
    await MyGlobal.prisma.shopping_mall_platform_configs.findFirst({
      where: {
        config_name: body.config_name,
        id: { not: id },
        deleted_at: null,
      },
    });

  if (conflict) {
    throw new HttpException(
      `Config name '${body.config_name}' already exists`,
      409,
    );
  }

  // Current timestamp in ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Prepare update data
  const updated = await MyGlobal.prisma.shopping_mall_platform_configs.update({
    where: { id },
    data: {
      config_name: body.config_name,
      config_value: body.config_value,
      description: body.description ?? null,
      deleted_at:
        body.deleted_at === undefined ? existing.deleted_at : body.deleted_at,
      created_at:
        body.created_at === undefined
          ? existing.created_at
          : toISOStringSafe(body.created_at),
      updated_at: body.updated_at ? toISOStringSafe(body.updated_at) : now,
    },
  });

  return {
    id: updated.id,
    config_name: updated.config_name,
    config_value: updated.config_value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
