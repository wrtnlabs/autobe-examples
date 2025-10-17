import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import { IPageIEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorReports(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumReport.IRequest;
}): Promise<IPageIEconPoliticalForumReport> {
  const { administrator, body } = props;

  // Authorization: ensure the administrator is enrolled and active
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (!adminRecord)
    throw new HttpException("Unauthorized: administrator not found", 403);

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );
  const skip = (page - 1) * limit;

  // Build where condition based on filters and search
  const filters = body.filters ?? {};
  const whereCondition: Record<string, unknown> = {
    ...(body.includeDeleted ? {} : { deleted_at: null }),
    ...(filters.status !== undefined && filters.status !== null
      ? { status: filters.status }
      : {}),
    ...(filters.priority !== undefined && filters.priority !== null
      ? { priority: filters.priority }
      : {}),
    ...(filters.reporter_anonymous !== undefined &&
    filters.reporter_anonymous !== null
      ? { reporter_anonymous: filters.reporter_anonymous }
      : {}),
    ...(filters.reported_post_id !== undefined &&
    filters.reported_post_id !== null
      ? { reported_post_id: filters.reported_post_id }
      : {}),
    ...(filters.reported_thread_id !== undefined &&
    filters.reported_thread_id !== null
      ? { reported_thread_id: filters.reported_thread_id }
      : {}),
    ...(filters.moderator_id !== undefined && filters.moderator_id !== null
      ? { moderator_id: filters.moderator_id }
      : {}),
    ...(filters.moderation_case_id !== undefined &&
    filters.moderation_case_id !== null
      ? { moderation_case_id: filters.moderation_case_id }
      : {}),
    ...((filters.created_from !== undefined && filters.created_from !== null) ||
    (filters.created_to !== undefined && filters.created_to !== null)
      ? {
          created_at: {
            ...(filters.created_from !== undefined &&
            filters.created_from !== null
              ? { gte: filters.created_from }
              : {}),
            ...(filters.created_to !== undefined && filters.created_to !== null
              ? { lte: filters.created_to }
              : {}),
          },
        }
      : {}),
    ...(body.query ? { reporter_text: { contains: body.query } } : {}),
  };

  // Sort handling - ensure SortOrder types from Prisma
  const orderBy:
    | Prisma.econ_political_forum_reportsOrderByWithRelationInput
    | undefined =
    body.sort && body.sort.sort_by
      ? body.sort.sort_by === "created_at"
        ? {
            created_at:
              body.sort.order === "asc"
                ? ("asc" as Prisma.SortOrder)
                : ("desc" as Prisma.SortOrder),
          }
        : body.sort.sort_by === "priority"
          ? {
              priority:
                body.sort.order === "asc"
                  ? ("asc" as Prisma.SortOrder)
                  : ("desc" as Prisma.SortOrder),
            }
          : {
              status:
                body.sort.order === "asc"
                  ? ("asc" as Prisma.SortOrder)
                  : ("desc" as Prisma.SortOrder),
            }
      : { created_at: "desc" as Prisma.SortOrder };

  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_reports.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_reports.count({
      where: whereCondition,
    }),
  ]);

  // Sanitizer for reporter_text: remove control characters
  const sanitize = (t?: string | null) =>
    t ? t.replace(/[[\u0000-\u001F\u007F]]/g, "") : null;

  // Map results to DTO
  const data = rows.map((r) => ({
    id: r.id,
    reporter_id: r.reporter_id ?? null,
    reported_post_id: r.reported_post_id ?? null,
    reported_thread_id: r.reported_thread_id ?? null,
    moderator_id: r.moderator_id ?? null,
    moderation_case_id: r.moderation_case_id ?? null,
    reason_code: r.reason_code,
    reporter_text: sanitize(r.reporter_text ?? null),
    reporter_anonymous: r.reporter_anonymous,
    status: r.status,
    priority: r.priority,
    created_at: toISOStringSafe(r.created_at),
    triaged_at: r.triaged_at ? toISOStringSafe(r.triaged_at) : null,
    reviewed_at: r.reviewed_at ? toISOStringSafe(r.reviewed_at) : null,
    resolved_at: r.resolved_at ? toISOStringSafe(r.resolved_at) : null,
  })) as IEconPoliticalForumReport[];

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
