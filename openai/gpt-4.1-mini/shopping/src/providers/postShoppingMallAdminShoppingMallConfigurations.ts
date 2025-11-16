import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  // Check if key already exists
  const existing =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { key: props.body.key },
    });

  if (existing !== null) {
    throw new HttpException(
      `Configuration with key '${props.body.key}' already exists.`,
      409,
    );
  }

  // Create new configuration
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_configurations.create({
    data: {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
