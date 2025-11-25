import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorDashboardModerationQueue(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardContentReport.IRequest;
}): Promise<IPageIDiscussionBoardContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: {
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.report_category !== undefined && {
          report_category: props.body.report_category,
        }),
        ...(props.body.discussion_board_article_id !== undefined && {
          discussion_board_article_id: props.body.discussion_board_article_id,
        }),
        ...(props.body.discussion_board_member_id !== undefined && {
          discussion_board_member_id: props.body.discussion_board_member_id,
        }),
        ...(props.body.resolved_by_moderator_id !== undefined && {
          resolved_by_moderator_id: props.body.resolved_by_moderator_id,
        }),
        ...((props.body.created_at_from !== undefined ||
          props.body.created_at_to !== undefined) && {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }),
        ...((props.body.resolved_at_from !== undefined ||
          props.body.resolved_at_to !== undefined) && {
          resolved_at: {
            ...(props.body.resolved_at_from !== undefined && {
              gte: new Date(props.body.resolved_at_from),
            }),
            ...(props.body.resolved_at_to !== undefined && {
              lte: new Date(props.body.resolved_at_to),
            }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
    }),
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.report_category !== undefined && {
          report_category: props.body.report_category,
        }),
        ...(props.body.discussion_board_article_id !== undefined && {
          discussion_board_article_id: props.body.discussion_board_article_id,
        }),
        ...(props.body.discussion_board_member_id !== undefined && {
          discussion_board_member_id: props.body.discussion_board_member_id,
        }),
        ...(props.body.resolved_by_moderator_id !== undefined && {
          resolved_by_moderator_id: props.body.resolved_by_moderator_id,
        }),
        ...((props.body.created_at_from !== undefined ||
          props.body.created_at_to !== undefined) && {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }),
        ...((props.body.resolved_at_from !== undefined ||
          props.body.resolved_at_to !== undefined) && {
          resolved_at: {
            ...(props.body.resolved_at_from !== undefined && {
              gte: new Date(props.body.resolved_at_from),
            }),
            ...(props.body.resolved_at_to !== undefined && {
              lte: new Date(props.body.resolved_at_to),
            }),
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      discussion_board_article_id:
        report.discussion_board_article_id as string & tags.Format<"uuid">,
      discussion_board_member_id: report.discussion_board_member_id as string &
        tags.Format<"uuid">,
      resolved_by_moderator_id:
        report.resolved_by_moderator_id === null
          ? undefined
          : (report.resolved_by_moderator_id as string & tags.Format<"uuid">),
      report_category: report.report_category as
        | "Spam"
        | "Offensive Content"
        | "Misinformation"
        | "Off-Topic"
        | "Other",
      report_details:
        report.report_details === null ? undefined : report.report_details,
      status: report.status as
        | "pending"
        | "reviewed_no_action"
        | "reviewed_edited"
        | "reviewed_removed",
      resolution_notes:
        report.resolution_notes === null ? undefined : report.resolution_notes,
      created_at: toISOStringSafe(report.created_at),
      resolved_at:
        report.resolved_at === null
          ? undefined
          : toISOStringSafe(report.resolved_at),
    })),
  };
}
