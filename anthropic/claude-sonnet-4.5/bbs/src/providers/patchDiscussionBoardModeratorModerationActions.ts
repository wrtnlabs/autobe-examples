import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction> {
  const { moderator, body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.findMany({
      where: {
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity_level: body.severity,
          }),
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.assigned_moderator_id !== undefined &&
          body.assigned_moderator_id !== null && {
            assigned_moderator_id: body.assigned_moderator_id,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
      include: {
        reportedTopic: true,
        reportedReply: true,
      },
      orderBy:
        body.sort_by === "severity"
          ? { severity_level: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "created_at"
            ? { created_at: body.sort_order === "asc" ? "asc" : "desc" }
            : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where: {
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity_level: body.severity,
          }),
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.assigned_moderator_id !== undefined &&
          body.assigned_moderator_id !== null && {
            assigned_moderator_id: body.assigned_moderator_id,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IDiscussionBoardModerationAction[] = reports.map((report) => {
    const actionType: IDiscussionBoardModerationAction["action_type"] =
      report.status === "resolved"
        ? "hide_content"
        : report.status === "dismissed"
          ? "dismiss_report"
          : "dismiss_report";

    const violationCategory: IDiscussionBoardModerationAction["violation_category"] =
      report.violation_category === "personal_attack" ||
      report.violation_category === "hate_speech" ||
      report.violation_category === "misinformation" ||
      report.violation_category === "spam" ||
      report.violation_category === "offensive_language" ||
      report.violation_category === "off_topic" ||
      report.violation_category === "threats" ||
      report.violation_category === "doxxing" ||
      report.violation_category === "trolling" ||
      report.violation_category === "other"
        ? report.violation_category
        : undefined;

    return {
      id: report.id as string & tags.Format<"uuid">,
      moderator_id:
        report.assigned_moderator_id !== null
          ? (report.assigned_moderator_id as string & tags.Format<"uuid">)
          : undefined,
      administrator_id: undefined,
      target_member_id: report.reporter_member_id as string &
        tags.Format<"uuid">,
      related_report_id: report.id as string & tags.Format<"uuid">,
      content_topic_id:
        report.reported_topic_id !== null
          ? (report.reported_topic_id as string & tags.Format<"uuid">)
          : undefined,
      content_reply_id:
        report.reported_reply_id !== null
          ? (report.reported_reply_id as string & tags.Format<"uuid">)
          : undefined,
      action_type: actionType,
      reason: report.reporter_explanation ?? "Report pending review",
      violation_category: violationCategory,
      content_snapshot:
        report.reportedTopic?.body ??
        report.reportedReply?.content ??
        undefined,
      is_reversed: false,
      reversed_at: undefined,
      reversal_reason: undefined,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
