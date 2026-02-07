import { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
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

export async function getCommunityAdminDashboardHealth(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformMetadatum> {
  const latestMetadata =
    await MyGlobal.prisma.community_platform_metadata.findFirst({
      orderBy: { created_at: "desc" },
      take: 1,
    });
  if (!latestMetadata) {
    return {
      status: "unhealthy" as "unhealthy",
      uptime: 0,
    };
  }
  const nowMillis = Date.now();
  const createdMillis = latestMetadata.created_at.getTime();
  const uptimeSeconds = Math.floor((nowMillis - createdMillis) / 1000);
  return {
    version: latestMetadata.version,
    environment: latestMetadata.environment,
    status:
      latestMetadata.status === "success"
        ? ("healthy" as "healthy")
        : ("unhealthy" as "unhealthy"),
    created_at: toISOStringSafe(latestMetadata.created_at) as string &
      tags.Format<"date-time">,
    updated_at: latestMetadata.updated_at
      ? (toISOStringSafe(latestMetadata.updated_at) as string &
          tags.Format<"date-time">)
      : null,
    uptime: uptimeSeconds,
  };
}
