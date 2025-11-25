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

export async function patchDiscussionBoardModeratorArticlesArticleIdReports(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentReport.IRequest;
}): Promise<IPageIDiscussionBoardContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "asc";

  const whereCondition: Record<string, unknown> = {
    discussion_board_article_id: props.articleId,
  };

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (props.body.report_category) {
    whereCondition.report_category = props.body.report_category;
  }

  if (props.body.discussion_board_member_id) {
    whereCondition.discussion_board_member_id =
      props.body.discussion_board_member_id;
  }

  if (props.body.resolved_by_moderator_id) {
    whereCondition.resolved_by_moderator_id =
      props.body.resolved_by_moderator_id;
  }

  if (props.body.created_at_from || props.body.created_at_to) {
    const createdAtCondition: Record<string, unknown> = {};
    if (props.body.created_at_from) {
      createdAtCondition.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to) {
      createdAtCondition.lte = new Date(props.body.created_at_to);
    }
    whereCondition.created_at = createdAtCondition;
  }

  if (props.body.resolved_at_from || props.body.resolved_at_to) {
    const resolvedAtCondition: Record<string, unknown> = {};
    if (props.body.resolved_at_from) {
      resolvedAtCondition.gte = new Date(props.body.resolved_at_from);
    }
    if (props.body.resolved_at_to) {
      resolvedAtCondition.lte = new Date(props.body.resolved_at_to);
    }
    whereCondition.resolved_at = resolvedAtCondition;
  }

  const orderByCondition: Record<string, "asc" | "desc"> = {};
  if (sortBy === "created_at") {
    orderByCondition.created_at = order;
  } else if (sortBy === "resolved_at") {
    orderByCondition.resolved_at = order;
  } else if (sortBy === "status") {
    orderByCondition.status = order;
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: whereCondition,
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
      id: report.id,
      discussion_board_article_id: report.discussion_board_article_id,
      discussion_board_member_id: report.discussion_board_member_id,
      resolved_by_moderator_id: report.resolved_by_moderator_id ?? null,
      report_category: typia.assert<
        "Spam" | "Offensive Content" | "Misinformation" | "Off-Topic" | "Other"
      >(report.report_category),
      report_details: report.report_details ?? null,
      status: typia.assert<
        | "pending"
        | "reviewed_no_action"
        | "reviewed_edited"
        | "reviewed_removed"
      >(report.status),
      resolution_notes: report.resolution_notes ?? null,
      created_at: toISOStringSafe(report.created_at),
      resolved_at: report.resolved_at
        ? toISOStringSafe(report.resolved_at)
        : null,
    })),
  };
}
