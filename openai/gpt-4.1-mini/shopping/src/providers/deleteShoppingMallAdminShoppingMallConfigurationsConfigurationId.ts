import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { configurationId } = props;

  // Check existence of configuration
  await MyGlobal.prisma.shopping_mall_configurations
    .findUniqueOrThrow({
      where: { id: configurationId },
    })
    .catch(() => {
      throw new HttpException("Configuration not found", 404);
    });

  // Hard delete
  await MyGlobal.prisma.shopping_mall_configurations.delete({
    where: { id: configurationId },
  });
}
