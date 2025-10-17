import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurations";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IShoppingMallConfigurations.IUpdate;
}): Promise<IShoppingMallConfigurations> {
  const { admin, configurationId, body } = props;

  const existing = await MyGlobal.prisma.shopping_mall_configurations.findFirst(
    {
      where: {
        id: configurationId,
        deleted_at: null,
      },
    },
  );

  if (existing === null) {
    throw new HttpException("Configuration not found", 404);
  }

  // Prevent changing the key
  if (body.key !== undefined && body.key !== existing.key) {
    throw new HttpException(
      "Key field is immutable and cannot be changed",
      400,
    );
  }

  // Prepare updated_at timestamp
  const updatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;

  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: configurationId },
    data: {
      value: body.value,
      category: body.category ?? null,
      description: body.description ?? null,
      enabled: body.enabled,
      updated_at: updatedAt,
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    category: updated.category ?? null,
    description: updated.description ?? null,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
