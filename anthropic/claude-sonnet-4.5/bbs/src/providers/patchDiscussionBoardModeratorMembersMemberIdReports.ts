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

export async function patchDiscussionBoardModeratorMembersMemberIdReports(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentReport.IRequest;
}): Promise<IPageIDiscussionBoardContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "asc";

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: {
        discussion_board_member_id: props.memberId,
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.report_category !== undefined && {
          report_category: props.body.report_category,
        }),
        ...(props.body.discussion_board_article_id !== undefined && {
          discussion_board_article_id: props.body.discussion_board_article_id,
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
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        discussion_board_member_id: props.memberId,
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.report_category !== undefined && {
          report_category: props.body.report_category,
        }),
        ...(props.body.discussion_board_article_id !== undefined && {
          discussion_board_article_id: props.body.discussion_board_article_id,
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
    data: reports.map((report) => ({
      id: report.id,
      discussion_board_article_id: report.discussion_board_article_id,
      discussion_board_member_id: report.discussion_board_member_id,
      resolved_by_moderator_id: report.resolved_by_moderator_id ?? undefined,
      report_category: typia.assert<
        "Spam" | "Offensive Content" | "Misinformation" | "Off-Topic" | "Other"
      >(report.report_category),
      report_details: report.report_details ?? undefined,
      status: typia.assert<
        | "pending"
        | "reviewed_no_action"
        | "reviewed_edited"
        | "reviewed_removed"
      >(report.status),
      resolution_notes: report.resolution_notes ?? undefined,
      created_at: toISOStringSafe(report.created_at),
      resolved_at: report.resolved_at
        ? toISOStringSafe(report.resolved_at)
        : undefined,
    })),
  };
}
