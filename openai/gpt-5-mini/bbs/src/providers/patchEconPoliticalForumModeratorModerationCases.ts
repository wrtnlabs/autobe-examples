import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import { IPageIEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationCase";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconPoliticalForumModeratorModerationCases(props: {
  moderator: ModeratorPayload;
  body: IEconPoliticalForumModerationCase.IRequest;
}): Promise<IPageIEconPoliticalForumModerationCase.ISummary> {
  const { moderator, body } = props;

  // Authorization presence check (decorator already enforces role and enrollment)
  if (!moderator) throw new HttpException("Unauthorized", 401);

  // includeDeleted is restricted to administrators only
  if (body.includeDeleted === true) {
    throw new HttpException(
      "Forbidden: includeDeleted restricted to admin",
      403,
    );
  }

  const page = Number(body.page ?? 1);
  let limit = Number(body.limit ?? 20);
  if (limit <= 0) limit = 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  // Build where condition inline, checking both undefined and null for required-field compatibility
  const where = {
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.priority !== undefined &&
      body.priority !== null && { priority: body.priority }),
    ...(body.assigned_moderator_id !== undefined &&
      body.assigned_moderator_id !== null && {
        assigned_moderator_id: body.assigned_moderator_id,
      }),
    ...(body.owner_admin_id !== undefined &&
      body.owner_admin_id !== null && { owner_admin_id: body.owner_admin_id }),
    ...(body.case_number !== undefined &&
      body.case_number !== null && { case_number: body.case_number }),
    ...(body.legal_hold !== undefined &&
      body.legal_hold !== null && { legal_hold: body.legal_hold }),
    // Default: exclude soft-deleted records
    deleted_at: null,
    // created_at range
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: toISOStringSafe(body.created_from),
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: toISOStringSafe(body.created_to),
              }),
          },
        }
      : {}),
  };

  // Full-text-ish search on title and summary using contains (SQLite-compatible)
  const searchCondition =
    body.query !== undefined && body.query !== null
      ? {
          OR: [
            { title: { contains: body.query } },
            { summary: { contains: body.query } },
          ],
        }
      : {};

  // Use explicit null/undefined check when merging searchCondition so empty string queries are honored when provided
  const whereCondition = {
    ...where,
    ...(body.query !== undefined && body.query !== null ? searchCondition : {}),
  };

  // Sorting: allowed fields: created_at, priority, case_number
  // Ensure the sort order value is narrowed to Prisma.SortOrder
  const sortOrder = (
    body.sort_order === "asc" ? "asc" : "desc"
  ) as Prisma.SortOrder;

  const orderBy =
    body.sort_by === "priority"
      ? { priority: sortOrder }
      : body.sort_by === "case_number"
        ? { case_number: sortOrder }
        : { created_at: sortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_moderation_cases.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_moderation_cases.count({
      where: whereCondition,
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    case_number: r.case_number,
    title: r.title ?? undefined,
    status: r.status,
    priority: r.priority,
    assigned_moderator_id: r.assigned_moderator_id ?? null,
    owner_admin_id: r.owner_admin_id ?? null,
    lead_report_id: r.lead_report_id ?? null,
    legal_hold: r.legal_hold,
    created_at: toISOStringSafe(r.created_at),
    updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    closed_at: r.closed_at ? toISOStringSafe(r.closed_at) : null,
  }));

  const pages = Math.ceil(total / limit) || 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
