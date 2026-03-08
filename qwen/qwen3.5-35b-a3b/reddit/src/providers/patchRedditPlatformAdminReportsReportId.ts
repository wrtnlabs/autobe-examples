import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IStatusUpdate;
}): Promise<IRedditPlatformReport> {
  const existingReport =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      include: {
        community: true,
      },
    });
  if (existingReport.status !== "PENDING") {
    throw new HttpException("Report is not in pending state", 400);
  }
  const newStatus: "RESOLVED" | "DISMISSED" = typia.assert<
    "RESOLVED" | "DISMISSED"
  >(props.body.status);
  const updatedReport = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: newStatus,
      resolved_by_id: props.admin.id,
      updated_at: new Date(),
    },
    ...RedditPlatformReportTransformer.select(),
  });
  await MyGlobal.prisma.reddit_platform_report_snapshots.create({
    data: {
      id: v4(),
      reddit_platform_report_id: props.reportId,
      status: newStatus,
      resolved_by: props.admin.id,
      reporter_id: existingReport.reporter_id,
      community_id: existingReport.community_id,
      reported_content_type: existingReport.reported_content_type,
      reported_content_id: existingReport.reported_content_id,
      reason: existingReport.reason,
      snapshot_created_at: existingReport.created_at,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.reddit_platform_report_views.create({
    data: {
      id: v4(),
      report_id: props.reportId,
      moderator_id: props.admin.id,
      viewed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  return await RedditPlatformReportTransformer.transform(updatedReport);
}
