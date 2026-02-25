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

export async function deleteCommunityPlatformAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the configuration exists and is not already deleted
  const configuration =
    await MyGlobal.prisma.community_platform_configurations.findUniqueOrThrow({
      where: { id: props.configurationId },
      select: { id: true, deleted_at: true },
    });
  if (configuration.deleted_at !== null) {
    throw new HttpException("Configuration already deleted", 400);
  }
  // Perform soft delete by setting deleted_at timestamp
  const currentTimestamp = new Date().toISOString();
  await MyGlobal.prisma.community_platform_configurations.update({
    where: { id: props.configurationId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
