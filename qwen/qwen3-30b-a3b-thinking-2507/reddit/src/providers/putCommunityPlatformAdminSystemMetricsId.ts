import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
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

export async function putCommunityPlatformAdminSystemMetricsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemMetric.IUpdate;
}): Promise<ICommunityPlatformSystemMetric> {
  const metric =
    await MyGlobal.prisma.community_platform_system_metrics.findUnique({
      where: { id: props.id },
    });
  if (!metric) {
    throw new HttpException("Metric not found", 404);
  }
  const updatedMetric =
    await MyGlobal.prisma.community_platform_system_metrics.update({
      where: { id: props.id },
      data: {
        value: (props.body as any).value,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updatedMetric.id,
    value: updatedMetric.value,
    metric_type: updatedMetric.metric_type,
    timestamp: toISOStringSafe(updatedMetric.timestamp),
  };
}
