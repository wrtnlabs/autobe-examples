import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import { IPageIDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAbuseReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAbuseReports(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAbuseReport.IRequest;
}): Promise<IPageIDiscussionBoardAbuseReport.ISummary> {
  const { body } = props;

  // Pagination defaults
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const take = Math.max(1, Math.min(limit, 100));
  const skip = (page - 1) * take;

  // Sorting
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "abuse_category",
    "status",
  ] as const;
  const sort_by = allowedSortFields.includes(body.sort_by as any)
    ? body.sort_by
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Build created_at filter as needed
  let createdAtFilter: { gte?: string; lte?: string } | undefined;
  if (body.created_from !== undefined && body.created_from !== null) {
    createdAtFilter = { gte: body.created_from };
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    createdAtFilter = { ...(createdAtFilter ?? {}), lte: body.created_to };
  }

  // WHERE clause construction (do not reference 'where' inside itself)
  const where = {
    ...(body.abuse_category !== undefined &&
      body.abuse_category !== null && { abuse_category: body.abuse_category }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reporter_user_id !== undefined &&
      body.reporter_user_id !== null && {
        reporter_user_id: body.reporter_user_id,
      }),
    ...(body.target_article_id !== undefined &&
      body.target_article_id !== null && {
        target_article_id: body.target_article_id,
      }),
    ...(body.target_comment_id !== undefined &&
      body.target_comment_id !== null && {
        target_comment_id: body.target_comment_id,
      }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
    ...(body.reason_search !== undefined &&
      body.reason_search !== null && {
        reason: {
          contains: body.reason_search,
        },
      }),
  };

  // Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_abuse_reports.findMany({
      where,
      orderBy: { [sort_by!]: sort_order },
      skip,
      take,
      select: {
        id: true,
        reporter_user_id: true,
        target_article_id: true,
        target_comment_id: true,
        abuse_category: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        reporterUser: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_abuse_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(take),
      records: total,
      pages: Math.max(1, Math.ceil(total / take)),
    },
    data: rows.map((report) => ({
      id: report.id,
      reporter: {
        id: report.reporterUser.id,
        display_name: report.reporterUser.display_name,
        avatar_url: report.reporterUser.avatar_url ?? undefined,
      },
      target_article_id: report.target_article_id ?? null,
      target_comment_id: report.target_comment_id ?? null,
      abuse_category: report.abuse_category,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    })),
  };
}
