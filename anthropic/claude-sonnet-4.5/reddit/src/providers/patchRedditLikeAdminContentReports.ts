import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditLikeAdminContentReports(props: {
  admin: AdminPayload;
  body: IRedditLikeContentReport.IRequest;
}): Promise<IPageIRedditLikeContentReport> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_content_reports.findMany({
      where: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.content_type !== undefined && {
          content_type: body.content_type,
        }),
        ...(body.community_id !== undefined && {
          community_id: body.community_id,
        }),
        ...(body.is_high_priority !== undefined && {
          is_high_priority: body.is_high_priority,
        }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_content_reports.count({
      where: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.content_type !== undefined && {
          content_type: body.content_type,
        }),
        ...(body.community_id !== undefined && {
          community_id: body.community_id,
        }),
        ...(body.is_high_priority !== undefined && {
          is_high_priority: body.is_high_priority,
        }),
      },
    }),
  ]);

  const data = reports.map((report) => ({
    id: report.id as string & tags.Format<"uuid">,
    content_type: report.content_type,
    violation_categories: report.violation_categories,
    additional_context:
      report.additional_context === null
        ? undefined
        : report.additional_context,
    status: report.status,
    is_anonymous_report: report.is_anonymous_report,
    is_high_priority: report.is_high_priority,
    created_at: toISOStringSafe(report.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
