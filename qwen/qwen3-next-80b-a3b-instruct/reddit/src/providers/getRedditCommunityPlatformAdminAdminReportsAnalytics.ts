import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminAdminReportsAnalytics(props: {
  platformAdmin: PlatformadminPayload;
}): Promise<IRedditCommunityReportAnalytic> {
  const result = await MyGlobal.prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL) AS total_pending,
      COUNT(*) FILTER (WHERE status = 'approved' AND deleted_at IS NULL) AS total_approved,
      COUNT(*) FILTER (WHERE status = 'dismissed' AND deleted_at IS NULL) AS total_dismissed,
      AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
      ) AS avg_resolution_hours
    FROM reddit_community_reports
    WHERE deleted_at IS NULL
      AND status IN ('approved', 'dismissed', 'pending')
  `;
  if (!Array.isArray(result) || result.length === 0) {
    return {
      total_pending: 0,
      total_approved: 0,
      total_dismissed: 0,
      avg_resolution_hours: 0,
    };
  }
  const normalized = result[0] as unknown as {
    total_pending: number;
    total_approved: number;
    total_dismissed: number;
    avg_resolution_hours: number | null;
  };
  return {
    total_pending: normalized.total_pending ?? 0,
    total_approved: normalized.total_approved ?? 0,
    total_dismissed: normalized.total_dismissed ?? 0,
    avg_resolution_hours: normalized.avg_resolution_hours ?? 0,
  };
}
