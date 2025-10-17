import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function getShoppingMallShoppingMallConfigurationsConfigurationId(props: {
  configurationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallConfiguration> {
  const { configurationId } = props;
  const configuration =
    await MyGlobal.prisma.shopping_mall_configurations.findUniqueOrThrow({
      where: { id: configurationId },
      select: {
        id: true,
        key: true,
        value: true,
        category: true,
        description: true,
        enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: configuration.id,
    key: configuration.key,
    value: configuration.value,
    category: configuration.category ?? null,
    description: configuration.description ?? null,
    enabled: configuration.enabled,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : null,
  };
}
