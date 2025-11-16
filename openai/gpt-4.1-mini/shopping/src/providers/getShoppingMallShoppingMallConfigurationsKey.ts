import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function getShoppingMallShoppingMallConfigurationsKey(props: {
  key: string;
}): Promise<IShoppingMallConfiguration> {
  const record = await MyGlobal.prisma.shopping_mall_configurations.findUnique({
    where: { key: props.key },
  });

  if (!record) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
