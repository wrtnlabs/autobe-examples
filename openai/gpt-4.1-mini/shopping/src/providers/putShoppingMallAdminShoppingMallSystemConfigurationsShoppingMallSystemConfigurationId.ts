import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallSystemConfigurationsShoppingMallSystemConfigurationId(props: {
  admin: AdminPayload;
  shoppingMallSystemConfigurationId: string & tags.Format<"uuid">;
  body: IShoppingMallSystemConfiguration.IUpdate;
}): Promise<IShoppingMallSystemConfiguration> {
  const existing =
    await MyGlobal.prisma.shopping_mall_system_configurations.findUnique({
      where: { id: props.shoppingMallSystemConfigurationId },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException(
      "Shopping mall system configuration not found",
      404,
    );
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_system_configurations.update({
      where: { id: props.shoppingMallSystemConfigurationId },
      data: {
        value: props.body.value,
        description: props.body.description ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
