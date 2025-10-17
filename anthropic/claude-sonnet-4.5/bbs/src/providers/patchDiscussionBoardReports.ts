import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  const { body } = props;

  const where = {
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.violation_category !== undefined &&
      body.violation_category !== null && {
        violation_category: body.violation_category,
      }),
    ...(body.severity_level !== undefined &&
      body.severity_level !== null && {
        severity_level: body.severity_level,
      }),
    ...(body.assigned_moderator_id !== undefined &&
      body.assigned_moderator_id !== null && {
        assigned_moderator_id: body.assigned_moderator_id,
      }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.findMany({
      where,
      orderBy:
        body.sort_by === "severity_level"
          ? { severity_level: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "priority"
            ? { severity_level: "desc" }
            : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where,
    }),
  ]);

  const data = reports.map((report) => ({
    id: report.id as string & tags.Format<"uuid">,
    violation_category: report.violation_category,
    severity_level: report.severity_level,
    status: report.status,
    reporter_member_id: report.reporter_member_id as string &
      tags.Format<"uuid">,
    reported_topic_id:
      report.reported_topic_id === null
        ? undefined
        : (report.reported_topic_id as string & tags.Format<"uuid">),
    reported_reply_id:
      report.reported_reply_id === null
        ? undefined
        : (report.reported_reply_id as string & tags.Format<"uuid">),
    assigned_moderator_id:
      report.assigned_moderator_id === null
        ? undefined
        : (report.assigned_moderator_id as string & tags.Format<"uuid">),
    created_at: toISOStringSafe(report.created_at),
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
