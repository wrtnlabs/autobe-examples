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

export async function getShoppingMallAdminShoppingMallSystemConfigurationsShoppingMallSystemConfigurationId(props: {
  admin: AdminPayload;
  shoppingMallSystemConfigurationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSystemConfiguration> {
  const record =
    await MyGlobal.prisma.shopping_mall_system_configurations.findUnique({
      where: { id: props.shoppingMallSystemConfigurationId },
    });

  if (!record) {
    throw new HttpException(
      "Shopping mall system configuration not found",
      404,
    );
  }

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
