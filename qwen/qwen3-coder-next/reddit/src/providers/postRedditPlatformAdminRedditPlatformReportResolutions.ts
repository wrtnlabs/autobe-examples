import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportResolutionTransformer } from "../transformers/RedditPlatformReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminRedditPlatformReportResolutions(props: {
  admin: AdminPayload;
  body: IRedditPlatformReportResolution.ICreate;
}): Promise<IRedditPlatformReportResolution> {
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.body.report_id },
  });
  if (!report) throw new HttpException("Report not found", 404);
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.reddit_platform_report_resolutions.create({
      data: {
        id: v4(),
        status: props.body.status,
        resolution_notes: props.body.resolution_notes ?? null,
        resolved_at: now,
        created_at: now,
        updated_at: now,
        admin: { connect: { id: props.admin.id } },
        report: { connect: { id: props.body.report_id } },
      },
      ...RedditPlatformReportResolutionTransformer.select(),
    });
  const transformed =
    await RedditPlatformReportResolutionTransformer.transform(created);
  // Update report status based on resolution
  if (props.body.status === "RESOLVED") {
    if (report.reported_type === "POST") {
      await MyGlobal.prisma.reddit_platform_posts.delete({
        where: { id: report.reported_id },
      });
    } else if (report.reported_type === "COMMENT") {
      await MyGlobal.prisma.reddit_platform_comments.delete({
        where: { id: report.reported_id },
      });
    }
  }
  return transformed;
}
