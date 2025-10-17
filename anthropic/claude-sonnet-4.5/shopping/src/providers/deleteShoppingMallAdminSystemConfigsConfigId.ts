import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { configId } = props;

  // Fetch the configuration to validate it exists and check editability
  const config =
    await MyGlobal.prisma.shopping_mall_system_configs.findUniqueOrThrow({
      where: { id: configId },
    });

  // Business rule: System-critical configurations cannot be deleted
  if (!config.is_editable) {
    throw new HttpException(
      "Cannot delete system-critical configuration. This configuration is marked as non-editable to prevent accidental removal of essential platform settings.",
      400,
    );
  }

  // Perform hard delete - no soft delete field in schema
  await MyGlobal.prisma.shopping_mall_system_configs.delete({
    where: { id: configId },
  });
}
