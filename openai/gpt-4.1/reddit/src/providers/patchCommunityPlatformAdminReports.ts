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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const {
    status,
    category,
    reporting_member_id,
    target_type,
    post_id,
    comment_id,
    moderated_by_id,
    created_at_from,
    created_at_to,
    search,
    sort,
    order,
    page,
    limit,
  } = props.body;

  // Pagination defaults
  const pageNum = page ?? 1;
  const limitNum = limit ?? 20;
  const skip = (pageNum - 1) * limitNum;

  // Build where condition
  const where: any = {
    ...(status !== undefined && { status }),
    ...(category !== undefined && { report_category_id: category }),
    ...(reporting_member_id !== undefined && { reporting_member_id }),
    ...(moderated_by_id !== undefined && { moderated_by_id }),
    ...(post_id !== undefined && { post_id }),
    ...(comment_id !== undefined && { comment_id }),
    ...((created_at_from !== undefined || created_at_to !== undefined) && {
      created_at: {
        ...(created_at_from !== undefined && { gte: created_at_from }),
        ...(created_at_to !== undefined && { lte: created_at_to }),
      },
    }),
  };

  // Apply target_type exclusivity
  if (target_type === "post") {
    where.post_id = { not: null };
  }
  if (target_type === "comment") {
    where.comment_id = { not: null };
  }

  // Text search (best effort: search in reason_text, moderation_result)
  if (search !== undefined && search.length > 0) {
    where.OR = [
      { reason_text: { contains: search } },
      { moderation_result: { contains: search } },
    ];
  }

  // Sorting
  let orderBy: any;
  const sortField =
    sort === "status" || sort === "category" || sort === "created_at"
      ? sort
      : "created_at";
  orderBy = { [sortField]: order === "asc" ? "asc" : "desc" };

  // Query reports
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_reports.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      select: {
        id: true,
        reporting_member_id: true,
        post_id: true,
        comment_id: true,
        report_category_id: true,
        status: true,
        moderation_result: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: rows.map((row) => ({
      id: row.id,
      reporting_member_id: row.reporting_member_id,
      post_id: row.post_id ?? undefined,
      comment_id: row.comment_id ?? undefined,
      report_category_id: row.report_category_id,
      status: row.status,
      moderation_result: row.moderation_result ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
