import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminContentReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityContentReport.IRequest;
}): Promise<IPageIRedditCommunityContentReport.ISummary> {
  const { admin, body } = props;

  const page: number & tags.Type<"int32"> = body.page ?? body.page_number ?? 1;
  const limit: number & tags.Type<"int32"> = body.limit ?? body.page_size ?? 10;

  const where: Prisma.reddit_community_content_reportsWhereInput = {
    deleted_at: body.include_deleted ? undefined : null,

    ...(body.report_status_id !== undefined &&
      body.report_status_id !== null && {
        report_status_id: body.report_status_id,
      }),

    ...(body.report_reason_id !== undefined &&
      body.report_reason_id !== null && {
        report_reason_id: body.report_reason_id,
      }),

    ...(body.reporter_id !== undefined &&
      body.reporter_id !== null && {
        reporter_id: body.reporter_id,
      }),

    ...(body.content_type !== undefined &&
      body.content_type !== null && {
        content_type: body.content_type,
      }),

    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && {
                gte: body.date_from,
              }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && {
                lte: body.date_to,
              }),
          },
        }
      : {}),

    ...(body.search_text !== undefined &&
      body.search_text !== null && {
        additional_details: {
          contains: body.search_text,
        },
      }),
  };

  const allowedSortFields = [
    "created_at",
    "updated_at",
    "report_status_id",
  ] as const;
  const sortBy: (typeof allowedSortFields)[number] = allowedSortFields.includes(
    body.sort_by ?? ("" as any),
  )
    ? (body.sort_by as (typeof allowedSortFields)[number])
    : "created_at";

  const sortOrder: "asc" | "desc" =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_content_reports.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        reporter_id: true,
        content_id: true,
        report_reason_id: true,
        report_status_id: true,
        content_type: true,
        additional_details: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_content_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((item) => ({
      id: item.id,
      reporter_id: item.reporter_id,
      content_id: item.content_id,
      report_reason_id: item.report_reason_id,
      report_status_id: item.report_status_id,
      content_type: item.content_type,
      additional_details:
        item.additional_details === null
          ? null
          : (item.additional_details ?? undefined),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
