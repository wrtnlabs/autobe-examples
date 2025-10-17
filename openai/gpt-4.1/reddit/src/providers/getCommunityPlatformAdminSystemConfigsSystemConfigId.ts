import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemConfig> {
  if (props.admin.type !== "admin") {
    throw new HttpException(
      "Forbidden: Only admins may access system configs",
      403,
    );
  }
  const config =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: {
        id: props.systemConfigId,
      },
    });
  if (!config) {
    throw new HttpException("System config not found", 404);
  }
  return {
    id: config.id,
    key: config.key,
    value: config.value,
    description: config.description ?? undefined,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
  };
}
