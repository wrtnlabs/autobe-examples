import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallSystemConfigurationsShoppingMallSystemConfigurationId(props: {
  admin: AdminPayload;
  shoppingMallSystemConfigurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingConfig =
    await MyGlobal.prisma.shopping_mall_system_configurations.findUnique({
      where: { id: props.shoppingMallSystemConfigurationId },
    });

  if (!existingConfig) {
    throw new HttpException(
      "Shopping mall system configuration not found",
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_system_configurations.delete({
    where: { id: props.shoppingMallSystemConfigurationId },
  });
}
