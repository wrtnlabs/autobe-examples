import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditReportAtSummaryTransformer } from "../transformers/RedditReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberReportsReportIdResolutions(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditReport.IResolution;
}): Promise<IRedditReport.ISummary> {
  const report = await MyGlobal.prisma.reddit_reports.findUniqueOrThrow({
    where: { id: props.reportId },
  });
  if (report.status !== "pending") {
    throw new HttpException(
      "Report status must be pending for resolution",
      400,
    );
  }
  if (props.body.resolutionType === "approve") {
    await MyGlobal.prisma.reddit_reports.update({
      where: { id: props.reportId },
      data: { status: "approved" },
    });
    await MyGlobal.prisma.reddit_report_resolutions.create({
      data: {
        report: {
          connect: { id: props.reportId },
        },
        moderator_id: props.member.id,
        resolution_type: "approve",
        dismissal_reason: null,
        resolution_date: toISOStringSafe(new Date()),
      },
    });
  } else if (props.body.resolutionType === "dismiss") {
    if (!props.body.dismissalReason) {
      throw new HttpException("Dismissal reason is required", 400);
    }
    await MyGlobal.prisma.reddit_reports.update({
      where: { id: props.reportId },
      data: { status: "dismissed" },
    });
    await MyGlobal.prisma.reddit_report_resolutions.create({
      data: {
        report: {
          connect: { id: props.reportId },
        },
        moderator_id: props.member.id,
        resolution_type: "dismiss",
        dismissal_reason: props.body.dismissalReason,
        resolution_date: toISOStringSafe(new Date()),
      },
    });
  } else {
    throw new HttpException("Invalid resolution type", 400);
  }
  const updatedReport = await MyGlobal.prisma.reddit_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditReportAtSummaryTransformer.select().select,
  });
  return await RedditReportAtSummaryTransformer.transform(updatedReport);
}
