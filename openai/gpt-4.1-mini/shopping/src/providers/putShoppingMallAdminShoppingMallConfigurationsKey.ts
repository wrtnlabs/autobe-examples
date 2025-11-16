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

export async function putShoppingMallAdminShoppingMallConfigurationsKey(props: {
  admin: AdminPayload;
  key: string;
  body: IShoppingMallConfiguration.IUpdate;
}): Promise<IShoppingMallConfiguration> {
  const existing =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { key: props.key },
    });

  if (!existing) {
    throw new HttpException(
      `Configuration with key ${props.key} not found`,
      404,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { key: props.key },
    data: {
      value: props.body.value,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
