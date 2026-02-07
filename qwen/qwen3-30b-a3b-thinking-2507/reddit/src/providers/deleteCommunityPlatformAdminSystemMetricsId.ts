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

export async function deleteCommunityPlatformAdminSystemMetricsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the system metric by ID
  const metric =
    await MyGlobal.prisma.community_platform_system_metrics.findUnique({
      where: { id: props.id },
    });
  // Check if the metric exists
  if (!metric) {
    throw new HttpException("Metric not found", 404);
  }
  // Delete the metric directly
  await MyGlobal.prisma.community_platform_system_metrics.delete({
    where: { id: props.id },
  });
}
