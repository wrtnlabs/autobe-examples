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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorContentReports(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityContentReport.IRequest;
}): Promise<IPageIRedditCommunityContentReport.ISummary> {
  const { moderator, body } = props;

  const page = body.page_number ?? body.page;
  const limit = body.page_size ?? body.limit;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at?: null | undefined;
    report_status_id?: string & tags.Format<"uuid">;
    report_reason_id?: string & tags.Format<"uuid">;
    reporter_id?: string & tags.Format<"uuid">;
    content_type?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    additional_details?: {
      contains: string;
    };
  } = {};

  if (!body.include_deleted) {
    where.deleted_at = null;
  }

  if (body.report_status_id !== undefined) {
    where.report_status_id = body.report_status_id;
  }

  if (body.report_reason_id !== undefined) {
    where.report_reason_id = body.report_reason_id;
  }

  if (body.reporter_id !== undefined) {
    where.reporter_id = body.reporter_id;
  }

  if (body.content_type !== undefined) {
    where.content_type = body.content_type;
  }

  if (body.date_from !== undefined || body.date_to !== undefined) {
    where.created_at = {};
    if (body.date_from !== undefined) {
      where.created_at.gte = body.date_from;
    }
    if (body.date_to !== undefined) {
      where.created_at.lte = body.date_to;
    }
  }

  if (body.search_text !== undefined && body.search_text.trim() !== "") {
    where.additional_details = {
      contains: body.search_text,
    };
  }

  let orderByField: "created_at" | "updated_at" | "report_status_id" =
    "created_at";
  if (
    body.sort_by === "created_at" ||
    body.sort_by === "updated_at" ||
    body.sort_by === "report_status_id"
  ) {
    orderByField = body.sort_by;
  }
  const orderDirection: "asc" | "desc" =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_content_reports.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
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

  const data = results.map((report) => ({
    id: report.id,
    reporter_id: report.reporter_id,
    content_id: report.content_id,
    report_reason_id: report.report_reason_id,
    report_status_id: report.report_status_id,
    content_type: report.content_type,
    additional_details: report.additional_details ?? null,
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
