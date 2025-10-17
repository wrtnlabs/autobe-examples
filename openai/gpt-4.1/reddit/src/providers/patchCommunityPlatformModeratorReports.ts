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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const { body } = props;
  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    deleted_at: null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.category ? { report_category_id: body.category } : {}),
    ...(body.reporting_member_id
      ? { reporting_member_id: body.reporting_member_id }
      : {}),
    ...(body.moderated_by_id ? { moderated_by_id: body.moderated_by_id } : {}),
    ...(body.post_id ? { post_id: body.post_id } : {}),
    ...(body.comment_id ? { comment_id: body.comment_id } : {}),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from ? { gte: body.created_at_from } : {}),
            ...(body.created_at_to ? { lte: body.created_at_to } : {}),
          },
        }
      : {}),
    ...(body.search
      ? {
          OR: [
            { reason_text: { contains: body.search } },
            { moderation_result: { contains: body.search } },
          ],
        }
      : {}),
  };
  // Sort logic
  let orderBy;
  if (body.sort === "status") {
    orderBy = {
      status: (body.order === "asc" ? "asc" : "desc") as Prisma.SortOrder,
    };
  } else if (body.sort === "category") {
    orderBy = {
      report_category_id: (body.order === "asc"
        ? "asc"
        : "desc") as Prisma.SortOrder,
    };
  } else {
    orderBy = {
      created_at: (body.order === "asc" ? "asc" : "desc") as Prisma.SortOrder,
    };
  }

  // Get data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_reports.count({ where }),
  ]);

  // Map to ISummary DTO
  const data = rows.map((report) => ({
    id: report.id,
    reporting_member_id: report.reporting_member_id,
    post_id: report.post_id ?? undefined,
    comment_id: report.comment_id ?? undefined,
    report_category_id: report.report_category_id,
    status: report.status,
    moderation_result: report.moderation_result ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  }));

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
