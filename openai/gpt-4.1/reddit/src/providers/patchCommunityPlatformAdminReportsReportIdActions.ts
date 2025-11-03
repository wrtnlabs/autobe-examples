import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import { IPageICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportActions";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminReportsReportIdActions(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportActions.IRequest;
}): Promise<IPageICommunityPlatformReportActions.ISummary> {
  const { admin, reportId, body } = props;

  // Authorization: ensure admin has access (already validated by controller middleware)

  // Validate the report exists
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: reportId },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException("Report not found.", 404);
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Filters
  const where = {
    report_id: reportId,
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.actor_admin_id !== undefined && {
      actor_admin_id: body.actor_admin_id,
    }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
  };

  // Sorting
  const orderBy =
    body.sort === "created_at_asc"
      ? { created_at: "asc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  // Query data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_report_actions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_report_actions.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    report_id: row.report_id,
    actor_admin_id: row.actor_admin_id ?? undefined,
    action_type: row.action_type,
    old_status: row.old_status ?? undefined,
    new_status: row.new_status ?? undefined,
    comment: row.comment ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
