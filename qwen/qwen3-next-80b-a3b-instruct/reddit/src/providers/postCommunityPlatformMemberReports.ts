import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { member, body } = props;

  // Validate exactly one target is provided
  if (!body.reportedContentId && !body.reportedCommentId) {
    throw new HttpException(
      "Exactly one of reportedContentId or reportedCommentId must be provided",
      400,
    );
  }

  if (body.reportedContentId && body.reportedCommentId) {
    throw new HttpException(
      "Cannot provide both reportedContentId and reportedCommentId",
      400,
    );
  }

  // Infer target type
  const target_type = body.reportedContentId ? "post" : "comment";

  // Validate target exists
  if (body.reportedContentId) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: body.reportedContentId },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
  } else if (body.reportedCommentId) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: body.reportedCommentId },
      });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
  }

  // Check report rate limiting
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const reportCount = await MyGlobal.prisma.community_platform_reports.count({
    where: {
      reporter_id: member.id,
      created_at: {
        gte: toISOStringSafe(twentyFourHoursAgo),
      },
    },
  });

  const platformSettings =
    await MyGlobal.prisma.community_platform_platform_settings.findFirst();
  if (!platformSettings) {
    throw new HttpException("Platform settings not found", 500);
  }

  if (reportCount >= platformSettings.max_reports_per_day) {
    throw new HttpException("Too many reports submitted today", 429);
  }

  // Create report
  const nowISO = toISOStringSafe(now);
  const report = await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reported_content_id: body.reportedContentId,
      reported_comment_id: body.reportedCommentId,
      reporter_id: member.id,
      target_type,
      status: "pending",
      report_reason: body.reportReason,
      report_notes: body.reportNotes,
      created_at: nowISO,
      updated_at: nowISO,
    },
  });

  // Return complete report object
  return {
    id: report.id,
    reported_content_id: report.reported_content_id ?? undefined,
    reported_comment_id: report.reported_comment_id ?? undefined,
    reporter_id: report.reporter_id,
    target_type: report.target_type,
    status: report.status,
    report_reason: report.report_reason,
    report_notes: report.report_notes ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };
}
