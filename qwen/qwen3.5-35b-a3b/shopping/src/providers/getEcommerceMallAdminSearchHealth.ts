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
  let status: "healthy" | "degraded" | "unhealthy";
  let lastUpdated: string = "";
  let metrics: ISearchHealthMetric | null = null;
  try {
    // Query the most recent updated_at timestamp and count of active records
    const healthData = (await MyGlobal.prisma.$queryRawUnsafe(`SELECT 
        MAX(updated_at) as max_updated_at,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_count
      FROM ecommerce_mall_search_indices`)) as {
      max_updated_at: string | null;
      total_count: bigint;
    }[];
    const row = healthData[0];
    const maxUpdatedAt = row.max_updated_at;
    const totalCount = Number(row.total_count);
    if (maxUpdatedAt) {
      lastUpdated = maxUpdatedAt;
      // Calculate hours since last update
      const lastUpdateDate = new Date(maxUpdatedAt);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
      // Round to 2 decimal places for reasonable precision
      const roundedHours = Math.round(hoursDiff * 100) / 100;
      // Determine status based on freshness
      if (roundedHours < 1) {
        status = "healthy";
      } else if (roundedHours <= 24) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }
      // Build metrics object
      metrics = {
        totalIndexedCount: totalCount,
        availabilityStatus: "available",
        freshnessHours: roundedHours,
      } satisfies ISearchHealthMetric;
    } else {
      // Table accessible but no data
      status = "unhealthy";
      lastUpdated = "";
      metrics = {
        totalIndexedCount: 0,
        availabilityStatus: "available",
        freshnessHours: null,
      } satisfies ISearchHealthMetric;
    }
  } catch (error) {
    // Table inaccessible - health check failed
    status = "unhealthy";
    lastUpdated = "";
    metrics = {
      totalIndexedCount: 0,
      availabilityStatus: "unavailable",
      freshnessHours: null,
    } satisfies ISearchHealthMetric;
  }
  return {
    status,
    lastUpdated,
    metrics,
  } satisfies ISearchHealthStatus;
}
