import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorReports(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const {
    report_type,
    status,
    reporter_user_id,
    reported_post_id,
    reported_comment_id,
    reported_community_id,
    reason,
    created_at_from,
    created_at_to,
    page,
    limit,
    sort_by,
    order,
  } = props.body;

  const where: Record<string, unknown> = {};

  if (report_type !== undefined) where.report_type = report_type;
  if (status !== undefined) where.status = status;
  if (reporter_user_id !== undefined) where.reporter_user_id = reporter_user_id;
  if (reported_post_id !== undefined) where.reported_post_id = reported_post_id;
  if (reported_comment_id !== undefined)
    where.reported_comment_id = reported_comment_id;
  if (reported_community_id !== undefined)
    where.reported_community_id = reported_community_id;
  if (reason !== undefined) {
    where.reason = { contains: reason };
  }
  if (created_at_from !== undefined || created_at_to !== undefined) {
    const createdAtRange: Record<string, string> = {};
    if (created_at_from !== undefined) createdAtRange.gte = created_at_from;
    if (created_at_to !== undefined) createdAtRange.lte = created_at_to;
    where.created_at = createdAtRange;
  }

  const pageNumber = page !== undefined && page >= 1 ? page : 1;
  let pageLimit = limit !== undefined ? limit : 100;
  if (pageLimit > 100) pageLimit = 100;
  if (pageLimit < 1) pageLimit = 1;
  const offset = (pageNumber - 1) * pageLimit;

  const orderField = sort_by !== undefined ? sort_by : "created_at";
  const orderDirection = order !== undefined ? order : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_reports.findMany({
      where,
      skip: offset,
      take: pageLimit,
      orderBy: {
        [orderField]: orderDirection,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: rows.map((row) => ({ id: row.id })),
  };
}
