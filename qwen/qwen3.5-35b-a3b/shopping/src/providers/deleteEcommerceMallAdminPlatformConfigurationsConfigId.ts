import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminPlatformConfigurationsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const configuration =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
        select: { id: true, deleted_at: true },
      },
    );
  if (configuration.deleted_at !== null) {
    throw new HttpException("Configuration is already deleted", 400);
  }
  await MyGlobal.prisma.ecommerce_mall_platform_configurations.update({
    where: { id: props.configId },
    data: {
      deleted_at: new Date(),
      is_active: false,
      updated_at: new Date(),
    },
  });
}
