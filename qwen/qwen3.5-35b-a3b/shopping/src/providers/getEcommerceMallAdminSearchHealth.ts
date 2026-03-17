import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ISearchHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthMetric";
import { ISearchHealthStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthStatus";
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

export async function getEcommerceMallAdminSearchHealth(props: {
  admin: AdminPayload;
}): Promise<ISearchHealthStatus> {
  const indices = await MyGlobal.prisma.ecommerce_mall_search_indices.findMany({
    select: {
      id: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const lastUpdatedDate =
    indices.length > 0
      ? new Date(Math.max(...indices.map((i) => i.updated_at.getTime())))
      : new Date(0);
  const lastUpdated = toISOStringSafe(lastUpdatedDate) as string &
    tags.Format<"date-time">;
  const totalIndexedCount = indices.filter((i) => !i.deleted_at).length;
  const freshnessHours = lastUpdated
    ? Math.floor(
        (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60),
      )
    : null;
  const status: "healthy" | "degraded" | "unhealthy" =
    !lastUpdated || freshnessHours === null || freshnessHours > 24
      ? "unhealthy"
      : freshnessHours < 1
        ? "healthy"
        : "degraded";
  return {
    status,
    lastUpdated: lastUpdated as string & tags.Format<"date-time">,
    metrics: {
      totalIndexedCount,
      availabilityStatus: "available",
      freshnessHours,
    } satisfies ISearchHealthMetric,
  } satisfies ISearchHealthStatus;
}
