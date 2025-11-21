import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSModerationEfficiency } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerationEfficiency";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityBBSAdminAnalyticsModerationEfficiency(props: {
  admin: AdminPayload;
}): Promise<ICommunityBBSModerationEfficiency> {
  const results = (await MyGlobal.prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', created_at) as period,
      COUNT(id) as total_reports,
      COUNT(CASE WHEN reviewed_at IS NOT NULL THEN 1 END) as reviewed_reports,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports,
      AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) as avg_hours_to_review,
      COUNT(CASE WHEN targeted_entity_type = 'post' THEN 1 END) as post_reports,
      COUNT(CASE WHEN targeted_entity_type = 'comment' THEN 1 END) as comment_reports
    FROM community_bbs_reports
    WHERE deleted_at IS NULL
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY period DESC
  `) as Array<{
    period: string | Date;
    total_reports: string;
    reviewed_reports: string;
    approved_reports: string;
    rejected_reports: string;
    avg_hours_to_review: string | null;
    post_reports: string;
    comment_reports: string;
  }>; // Cast to known structure

  return results.map((row: any) => ({
    period: toISOStringSafe(row.period),
    total_reports: Number(row.total_reports),
    reviewed_reports: Number(row.reviewed_reports),
    approved_reports: Number(row.approved_reports),
    rejected_reports: Number(row.rejected_reports),
    avg_hours_to_review:
      row.avg_hours_to_review !== null ? Number(row.avg_hours_to_review) : 0,
    post_reports: Number(row.post_reports),
    comment_reports: Number(row.comment_reports),
  }));
}
