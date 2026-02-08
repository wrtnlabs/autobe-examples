import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorReportsPending(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: { status: "pending" },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const reasonIds = Array.from(
    new Set(reports.map((r) => r.community_platform_report_reason_id)),
  );
  const reasonsRaw =
    await MyGlobal.prisma.community_platform_report_reasons.findMany({
      where: { id: { in: reasonIds } },
    });
  const reportIds = reports.map((r) => r.id);
  const reportedContentsRaw =
    await MyGlobal.prisma.community_platform_reported_contents.findMany({
      where: { community_platform_report_id: { in: reportIds } },
    });
  const reasonMap = new Map<
    string,
    {
      id: string;
      description: string;
    }
  >();
  for (const reason of reasonsRaw) {
    reasonMap.set(reason.id, {
      id: reason.id,
      description: reason.reason_text,
    });
  }
  const reportedContentsMap = new Map<
    string,
    Array<{
      id: string;
      content_type: string;
      content_id: string;
    }>
  >();
  for (const content of reportedContentsRaw) {
    if (!content.community_platform_report_id) continue;
    const arr =
      reportedContentsMap.get(content.community_platform_report_id) ?? [];
    let content_type = "";
    let content_id = "";
    if (content.community_platform_reported_post_id) {
      content_type = "post";
      content_id = content.community_platform_reported_post_id;
    } else if (content.community_platform_reported_comment_id) {
      content_type = "comment";
      content_id = content.community_platform_reported_comment_id;
    } else {
      continue; // skip if no known content id
    }
    arr.push({
      id: content.id,
      content_type,
      content_id,
    });
    reportedContentsMap.set(content.community_platform_report_id, arr);
  }
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: { status: "pending" },
  });
  const data: ICommunityPlatformReport.ISummary[] = reports.map((report) => {
    const reason = reasonMap.get(report.community_platform_report_reason_id);
    const reported_contents = reportedContentsMap.get(report.id) ?? [];
    return {
      id: report.id,
      reason: reason ?? { id: "", description: "" },
      reported_contents: reported_contents,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
