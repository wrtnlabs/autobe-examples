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

export async function deleteCommunityAdminUsageMetricsMetricId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.community_usage_metrics.delete({
    where: { id: props.metricId },
  });
  if (!deleted) {
    throw new HttpException("Usage metrics record not found", 404);
  }
}
