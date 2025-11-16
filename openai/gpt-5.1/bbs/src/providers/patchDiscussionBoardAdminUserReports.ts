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
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserReports(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  // Extract and normalize pagination parameters with sensible defaults
  const requestedPage = props.body.page !== undefined ? props.body.page : 1;
  const requestedLimit = props.body.limit !== undefined ? props.body.limit : 50;

  const safePage = requestedPage < 1 ? 1 : requestedPage;
  const safeLimit = requestedLimit < 0 ? 0 : requestedLimit;

  // Build dynamic where condition based on provided filters
  const buildWhereCondition = () => {
    const conditions: { [key: string]: unknown } = {};

    if (props.body.status !== undefined) {
      conditions.status = props.body.status;
    }

    if (props.body.target_type !== undefined) {
      conditions.target_type = props.body.target_type;
    }

    if (props.body.reporter_type !== undefined) {
      conditions.reporter_type = props.body.reporter_type;
    }

    if (
      props.body.created_from !== undefined ||
      props.body.created_to !== undefined
    ) {
      const createdAtRange: { [key: string]: unknown } = {};
      if (props.body.created_from !== undefined) {
        createdAtRange.gte = props.body.created_from;
      }
      if (props.body.created_to !== undefined) {
        createdAtRange.lte = props.body.created_to;
      }
      conditions.created_at = createdAtRange;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  // Determine orderBy clause with a safe fallback
  const allowedOrderByFields = ["created_at", "updated_at", "status", "action"];
  const requestedOrderBy = props.body.order_by;
  const requestedOrderDirection = props.body.order_direction;

  const isOrderByAllowed =
    requestedOrderBy !== undefined &&
    allowedOrderByFields.includes(requestedOrderBy);

  const normalizedDirection =
    requestedOrderDirection === "asc" || requestedOrderDirection === "desc"
      ? requestedOrderDirection
      : "desc";

  let orderBy: { [key: string]: "asc" | "desc" };

  if (isOrderByAllowed) {
    if (requestedOrderBy === "created_at") {
      orderBy = { created_at: normalizedDirection };
    } else if (requestedOrderBy === "updated_at") {
      orderBy = { updated_at: normalizedDirection };
    } else if (requestedOrderBy === "status") {
      orderBy = { status: normalizedDirection };
    } else if (requestedOrderBy === "action") {
      orderBy = { action: normalizedDirection };
    } else {
      // Fallback in case of any unexpected value
      orderBy = { created_at: "desc" };
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  // Count total records first to compute pagination
  const totalRecords = await MyGlobal.prisma.discussion_board_reports.count({
    where: whereCondition,
  });

  if (totalRecords === 0 || safeLimit === 0) {
    const pagination: IPage.IPagination = {
      current: 0,
      limit: safeLimit,
      records: totalRecords,
      pages: 0,
    };

    return {
      pagination,
      data: [],
    };
  }

  const totalPages = Math.ceil(totalRecords / safeLimit);

  // Clamp page into [1, totalPages]
  const effectivePage = safePage > totalPages ? totalPages : safePage;
  const skip = (effectivePage - 1) * safeLimit;

  const reports = await MyGlobal.prisma.discussion_board_reports.findMany({
    where: whereCondition,
    orderBy,
    skip,
    take: safeLimit,
  });

  const data: IDiscussionBoardReport.ISummary[] = reports.map((report) => ({
    id: report.id,
    target_type: report.target_type,
    reporter_type: report.reporter_type,
    reason_code: report.reason_code,
    status: report.status,
    action: report.action,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  }));

  const pagination: IPage.IPagination = {
    current: effectivePage - 1,
    limit: safeLimit,
    records: totalRecords,
    pages: totalPages,
  };

  return {
    pagination,
    data,
  };
}
