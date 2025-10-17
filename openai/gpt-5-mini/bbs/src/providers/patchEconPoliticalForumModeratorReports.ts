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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconPoliticalForumModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IEconPoliticalForumReport.IRequest;
}): Promise<IPageIEconPoliticalForumReport> {
  const { moderator, body } = props;

  // helper to normalize possible Date/string/null values from filters
  const normalizeFilterDate = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    return value instanceof Date ? toISOStringSafe(value) : value;
  };

  try {
    // Authorization: ensure the moderator still exists and is active
    const modRecord =
      await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
        where: {
          registereduser_id: moderator.id,
          deleted_at: null,
          is_active: true,
        },
      });
    if (!modRecord)
      throw new HttpException("Unauthorized: moderator not active", 403);

    // Pagination defaults and limits
    const page = Number(body.page ?? 1);
    const requestedLimit = Number(body.limit ?? 20);
    const limit = Math.min(Math.max(1, requestedLimit), 100);
    const skip = body.cursor ? 0 : (page - 1) * limit;

    // Sorting - allowed fields only
    const sortBy = body.sort?.sort_by ?? "created_at";
    const order: Prisma.SortOrder = body.sort?.order === "asc" ? "asc" : "desc";

    const orderBy =
      sortBy === "priority"
        ? { priority: order }
        : sortBy === "status"
          ? { status: order }
          : { created_at: order };

    // Build where condition inline
    const filters = body.filters ?? ({} as unknown);

    const createdFrom = normalizeFilterDate(
      (filters as any)?.created_from ??
        (filters as any)?.createdFrom ??
        (filters as any)?.from,
    );
    const createdTo = normalizeFilterDate(
      (filters as any)?.created_to ??
        (filters as any)?.createdTo ??
        (filters as any)?.to,
    );
    const triagedFrom = normalizeFilterDate(
      (filters as any)?.triaged_from ?? (filters as any)?.triagedFrom,
    );
    const triagedTo = normalizeFilterDate(
      (filters as any)?.triaged_to ?? (filters as any)?.triagedTo,
    );

    const whereCondition: any = {
      ...(body.includeDeleted !== true && { deleted_at: null }),
      ...(body.filters?.status !== undefined &&
        body.filters?.status !== null && { status: body.filters?.status }),
      ...(body.filters?.priority !== undefined &&
        body.filters?.priority !== null && {
          priority: body.filters?.priority,
        }),
      ...(body.filters?.reporter_anonymous !== undefined &&
        body.filters?.reporter_anonymous !== null && {
          reporter_anonymous: body.filters?.reporter_anonymous,
        }),
      ...(body.filters?.reported_post_id !== undefined &&
        body.filters?.reported_post_id !== null && {
          reported_post_id: body.filters?.reported_post_id,
        }),
      ...(body.filters?.reported_thread_id !== undefined &&
        body.filters?.reported_thread_id !== null && {
          reported_thread_id: body.filters?.reported_thread_id,
        }),
      ...(body.filters?.moderator_id !== undefined &&
        body.filters?.moderator_id !== null && {
          moderator_id: body.filters?.moderator_id,
        }),
      ...(body.filters?.moderation_case_id !== undefined &&
        body.filters?.moderation_case_id !== null && {
          moderation_case_id: body.filters?.moderation_case_id,
        }),
      ...((createdFrom !== undefined && createdFrom !== null) ||
      (createdTo !== undefined && createdTo !== null)
        ? {
            created_at: {
              ...(createdFrom !== undefined &&
                createdFrom !== null && { gte: createdFrom }),
              ...(createdTo !== undefined &&
                createdTo !== null && { lte: createdTo }),
            },
          }
        : {}),
      ...((triagedFrom !== undefined && triagedFrom !== null) ||
      (triagedTo !== undefined && triagedTo !== null)
        ? {
            triaged_at: {
              ...(triagedFrom !== undefined &&
                triagedFrom !== null && { gte: triagedFrom }),
              ...(triagedTo !== undefined &&
                triagedTo !== null && { lte: triagedTo }),
            },
          }
        : {}),
      ...(body.query !== undefined &&
        body.query !== null &&
        body.query !== "" && { reporter_text: { contains: body.query } }),
    };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_reports.findMany({
        where: whereCondition,
        orderBy,
        skip: body.cursor ? 1 : skip,
        take: limit,
        ...(body.cursor && body.cursor !== null
          ? { cursor: { id: body.cursor } }
          : {}),
      }),
      MyGlobal.prisma.econ_political_forum_reports.count({
        where: whereCondition,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      reporter_id: r.reporter_anonymous ? undefined : (r.reporter_id ?? null),
      reported_post_id: r.reported_post_id ?? null,
      reported_thread_id: r.reported_thread_id ?? null,
      moderator_id: r.moderator_id ?? null,
      moderation_case_id: r.moderation_case_id ?? null,
      reason_code: r.reason_code,
      reporter_text: r.reporter_text ?? null,
      reporter_anonymous: r.reporter_anonymous,
      status: r.status,
      priority: r.priority,
      created_at: toISOStringSafe(r.created_at),
      triaged_at: r.triaged_at ? toISOStringSafe(r.triaged_at) : null,
      reviewed_at: r.reviewed_at ? toISOStringSafe(r.reviewed_at) : null,
      resolved_at: r.resolved_at ? toISOStringSafe(r.resolved_at) : null,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })) satisfies IEconPoliticalForumReport[];

    const pagination = {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    };

    const result = {
      pagination,
      data,
    } satisfies IPageIEconPoliticalForumReport;

    return result;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
