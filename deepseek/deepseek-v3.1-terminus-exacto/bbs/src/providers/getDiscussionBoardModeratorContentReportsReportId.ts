import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorContentReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardContentReport> {
  // Fetch the main content report
  const report =
    await MyGlobal.prisma.discussion_board_content_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!report) {
    throw new HttpException("Content report not found", 404);
  }

  // Determine actor information based on actor_type
  let actor: IDiscussionBoardMember.ISummary;

  if (report.actor_type === "member") {
    // Fetch member-specific report data
    const memberReport =
      await MyGlobal.prisma.discussion_board_content_reports_of_members.findFirst(
        {
          where: { discussion_board_content_report_id: report.id },
          include: { member: true },
        },
      );

    if (!memberReport || !memberReport.member) {
      throw new HttpException("Associated member not found", 500);
    }

    actor = {
      id: memberReport.discussion_board_member_id,
      type: "member",
      name: memberReport.member.username,
    };
  } else if (report.actor_type === "moderator") {
    // Fetch moderator-specific report data
    const moderatorReport =
      await MyGlobal.prisma.discussion_board_content_reports_of_moderators.findFirst(
        {
          where: { discussion_board_content_report_id: report.id },
          include: { moderator: true },
        },
      );

    if (!moderatorReport || !moderatorReport.moderator) {
      throw new HttpException("Associated moderator not found", 500);
    }

    actor = {
      id: moderatorReport.discussion_board_moderator_id,
      type: "moderator",
      name: moderatorReport.moderator.username,
    };
  } else {
    throw new HttpException("Invalid report actor type", 500);
  }

  return {
    id: report.id,
    actor,
    report_reason: report.report_reason,
    report_details: report.report_details ?? undefined,
    status: report.status,
    priority: report.priority,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
