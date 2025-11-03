import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingSystemConfiguration.ICreate;
}): Promise<IShoppingSystemConfiguration> {
  // Enforce true case-insensitive uniqueness for config_key
  const key = props.body.config_key;
  const existing =
    await MyGlobal.prisma.shopping_system_configurations.findFirst({
      where: {
        config_key: {
          equals: key,
          // No 'mode: "insensitive"' for cross-db compat, so check explicitly
        },
      },
    });
  if (
    existing !== null &&
    existing.config_key.localeCompare(key, undefined, {
      sensitivity: "accent",
    }) === 0
  ) {
    throw new HttpException(
      "Duplicate config_key: configuration key already exists",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_system_configurations.create({
    data: {
      id: v4(),
      config_key: key,
      config_value: props.body.config_value,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
