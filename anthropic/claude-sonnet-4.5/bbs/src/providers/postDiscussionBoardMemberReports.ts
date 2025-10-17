import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberReports(props: {
  member: MemberPayload;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  const { member, body } = props;

  const hasTopicId =
    body.reported_topic_id !== undefined && body.reported_topic_id !== null;
  const hasReplyId =
    body.reported_reply_id !== undefined && body.reported_reply_id !== null;

  if (!hasTopicId && !hasReplyId) {
    throw new HttpException(
      "Either reported_topic_id or reported_reply_id must be provided",
      400,
    );
  }

  if (hasTopicId && hasReplyId) {
    throw new HttpException(
      "Only one of reported_topic_id or reported_reply_id can be provided",
      400,
    );
  }

  const reputation =
    await MyGlobal.prisma.discussion_board_user_reputation.findUnique({
      where: { discussion_board_member_id: member.id },
    });

  if (!reputation || reputation.total_score < 25) {
    throw new HttpException(
      "Minimum 25 reputation points required to submit reports",
      403,
    );
  }

  const currentTimestamp = toISOStringSafe(new Date());
  const oneHourMs = 60 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const oneHourAgoTimestamp = toISOStringSafe(new Date(Date.now() - oneHourMs));
  const twentyFourHoursAgoTimestamp = toISOStringSafe(
    new Date(Date.now() - twentyFourHoursMs),
  );

  if (hasTopicId && body.reported_topic_id !== null) {
    const duplicateTopicReport =
      await MyGlobal.prisma.discussion_board_reports.findFirst({
        where: {
          reporter_member_id: member.id,
          reported_topic_id: body.reported_topic_id,
          created_at: {
            gte: twentyFourHoursAgoTimestamp,
          },
        },
      });

    if (duplicateTopicReport) {
      throw new HttpException(
        "You have already reported this topic within the last 24 hours",
        409,
      );
    }
  }

  if (hasReplyId && body.reported_reply_id !== null) {
    const duplicateReplyReport =
      await MyGlobal.prisma.discussion_board_reports.findFirst({
        where: {
          reporter_member_id: member.id,
          reported_reply_id: body.reported_reply_id,
          created_at: {
            gte: twentyFourHoursAgoTimestamp,
          },
        },
      });

    if (duplicateReplyReport) {
      throw new HttpException(
        "You have already reported this reply within the last 24 hours",
        409,
      );
    }
  }

  const hourlyReportCount =
    await MyGlobal.prisma.discussion_board_reports.count({
      where: {
        reporter_member_id: member.id,
        created_at: {
          gte: oneHourAgoTimestamp,
        },
      },
    });

  if (hourlyReportCount >= 10) {
    throw new HttpException(
      "Maximum 10 reports per hour exceeded. Please try again later.",
      429,
    );
  }

  const dailyReportCount = await MyGlobal.prisma.discussion_board_reports.count(
    {
      where: {
        reporter_member_id: member.id,
        created_at: {
          gte: twentyFourHoursAgoTimestamp,
        },
      },
    },
  );

  if (dailyReportCount >= 50) {
    throw new HttpException(
      "Maximum 50 reports per day exceeded. Please try again later.",
      429,
    );
  }

  if (body.violation_category === "other") {
    if (
      !body.reporter_explanation ||
      body.reporter_explanation.trim().length < 20
    ) {
      throw new HttpException(
        "When selecting 'other' violation category, reporter_explanation is required with minimum 20 characters",
        400,
      );
    }
  }

  let severityLevel: string;
  if (
    body.violation_category === "hate_speech" ||
    body.violation_category === "threats" ||
    body.violation_category === "doxxing"
  ) {
    severityLevel = "critical";
  } else if (
    body.violation_category === "personal_attack" ||
    body.violation_category === "offensive_language"
  ) {
    severityLevel = "high";
  } else if (
    body.violation_category === "misinformation" ||
    body.violation_category === "spam" ||
    body.violation_category === "trolling"
  ) {
    severityLevel = "medium";
  } else {
    severityLevel = "low";
  }

  if (hasTopicId && body.reported_topic_id !== null) {
    const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
      where: { id: body.reported_topic_id },
    });
    if (!topic) {
      throw new HttpException("Reported topic not found", 404);
    }
  }

  if (hasReplyId && body.reported_reply_id !== null) {
    const reply = await MyGlobal.prisma.discussion_board_replies.findUnique({
      where: { id: body.reported_reply_id },
    });
    if (!reply) {
      throw new HttpException("Reported reply not found", 404);
    }
  }

  const reportId = v4();

  const created = await MyGlobal.prisma.discussion_board_reports.create({
    data: {
      id: reportId,
      reporter_member_id: member.id,
      reported_topic_id: body.reported_topic_id ?? null,
      reported_reply_id: body.reported_reply_id ?? null,
      assigned_moderator_id: null,
      violation_category: body.violation_category,
      severity_level: severityLevel,
      reporter_explanation: body.reporter_explanation ?? null,
      status: "pending",
      resolution_notes: null,
      dismissal_reason: null,
      resolved_at: null,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });

  return {
    id: reportId,
    reporter_member_id: created.reporter_member_id,
    reported_topic_id: created.reported_topic_id ?? undefined,
    reported_reply_id: created.reported_reply_id ?? undefined,
    assigned_moderator_id: created.assigned_moderator_id ?? undefined,
    violation_category: created.violation_category,
    severity_level: created.severity_level,
    reporter_explanation: created.reporter_explanation ?? undefined,
    status: created.status,
    resolution_notes: created.resolution_notes ?? undefined,
    dismissal_reason: created.dismissal_reason ?? undefined,
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : undefined,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  };
}
