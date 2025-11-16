import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportByReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByReasonStatistics";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserReportsStatisticsByReason(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardReportByReasonStatistics.IRequest;
}): Promise<IDiscussionBoardReportByReasonStatistics> {
  const requestBody = props.body;

  const andConditions: Prisma.discussion_board_reportsWhereInput[] = [];

  if (
    requestBody.created_at_from !== undefined &&
    requestBody.created_at_from !== null
  ) {
    andConditions.push({
      created_at: {
        gte: requestBody.created_at_from,
      },
    });
  }

  if (
    requestBody.created_at_to !== undefined &&
    requestBody.created_at_to !== null
  ) {
    andConditions.push({
      created_at: {
        lte: requestBody.created_at_to,
      },
    });
  }

  if (
    requestBody.updated_at_from !== undefined &&
    requestBody.updated_at_from !== null
  ) {
    andConditions.push({
      updated_at: {
        gte: requestBody.updated_at_from,
      },
    });
  }

  if (
    requestBody.updated_at_to !== undefined &&
    requestBody.updated_at_to !== null
  ) {
    andConditions.push({
      updated_at: {
        lte: requestBody.updated_at_to,
      },
    });
  }

  if (
    requestBody.target_types !== undefined &&
    requestBody.target_types.length > 0
  ) {
    andConditions.push({
      target_type: {
        in: requestBody.target_types,
      },
    });
  }

  if (
    requestBody.reporter_types !== undefined &&
    requestBody.reporter_types.length > 0
  ) {
    andConditions.push({
      reporter_type: {
        in: requestBody.reporter_types,
      },
    });
  }

  if (
    requestBody.reason_codes !== undefined &&
    requestBody.reason_codes.length > 0
  ) {
    andConditions.push({
      reason_code: {
        in: requestBody.reason_codes,
      },
    });
  }

  if (requestBody.statuses !== undefined && requestBody.statuses.length > 0) {
    andConditions.push({
      status: {
        in: requestBody.statuses,
      },
    });
  }

  if (requestBody.actions !== undefined && requestBody.actions.length > 0) {
    andConditions.push({
      action: {
        in: requestBody.actions,
      },
    });
  }

  const where: Prisma.discussion_board_reportsWhereInput =
    andConditions.length > 0
      ? {
          AND: andConditions,
        }
      : {};

  const rows = await MyGlobal.prisma.discussion_board_reports.findMany({
    where,
    select: {
      reason_code: true,
      status: true,
      action: true,
    },
  });

  const grouped: Record<string, IDiscussionBoardReportByReasonStatistics.IRow> =
    {};

  for (const row of rows) {
    const reason = row.reason_code;

    if (grouped[reason] === undefined) {
      grouped[reason] = {
        reason_code: reason,
        total_count: 0,
        submitted_count: 0,
        in_review_count: 0,
        resolved_count: 0,
        action_none_count: 0,
        action_keep_count: 0,
        action_hide_content_count: 0,
        action_delete_content_count: 0,
        action_restrict_user_count: 0,
      };
    }

    const statsRow = grouped[reason];

    statsRow.total_count += 1;

    if (row.status === "submitted") {
      statsRow.submitted_count += 1;
    } else if (row.status === "in_review") {
      statsRow.in_review_count += 1;
    } else if (row.status === "resolved") {
      statsRow.resolved_count += 1;
    }

    if (row.action === "none") {
      statsRow.action_none_count += 1;
    } else if (row.action === "keep") {
      statsRow.action_keep_count += 1;
    } else if (row.action === "hide_content") {
      statsRow.action_hide_content_count += 1;
    } else if (row.action === "delete_content") {
      statsRow.action_delete_content_count += 1;
    } else if (row.action === "restrict_user") {
      statsRow.action_restrict_user_count += 1;
    }
  }

  const items: IDiscussionBoardReportByReasonStatistics.IRow[] =
    Object.values(grouped);

  return {
    items,
  };
}
