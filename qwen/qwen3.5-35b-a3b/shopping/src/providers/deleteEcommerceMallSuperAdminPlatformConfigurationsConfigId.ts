import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSuperAdminPlatformConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify configuration exists and is not already deleted
  const config =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
      },
    );
  // Check if already deleted
  if (config.deleted_at !== null) {
    throw new HttpException("Configuration is already deleted", 400);
  }
  // Check if configuration is still active
  if (config.is_active === false) {
    throw new HttpException("Configuration is already inactive", 400);
  }
  // Perform soft delete: set deleted_at and mark inactive
  await MyGlobal.prisma.ecommerce_mall_platform_configurations.update({
    where: { id: props.configId },
    data: {
      deleted_at: new Date(),
      is_active: false,
    },
  });
}
