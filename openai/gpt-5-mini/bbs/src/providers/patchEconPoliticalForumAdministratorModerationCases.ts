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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorModerationCases(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumModerationCase.IRequest;
}): Promise<IPageIEconPoliticalForumModerationCase.ISummary> {
  const { administrator, body } = props;

  try {
    // Pagination defaults and limits
    const page = (body.page ?? 1) as number & tags.Type<"int32"> as number;
    const limit = Math.min(
      (body.limit ?? 20) as number & tags.Type<"int32"> as number,
      100,
    );
    const skip = (page - 1) * limit;

    // Perform queries in parallel. Build where inline for both operations.
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_moderation_cases.findMany({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.priority !== undefined && { priority: body.priority }),
          ...(body.assigned_moderator_id !== undefined && {
            assigned_moderator_id: body.assigned_moderator_id,
          }),
          ...(body.owner_admin_id !== undefined && {
            owner_admin_id: body.owner_admin_id,
          }),
          ...(body.case_number !== undefined && {
            case_number: body.case_number,
          }),
          ...(body.legal_hold !== undefined && { legal_hold: body.legal_hold }),
          ...(body.query && {
            OR: [
              { summary: { contains: body.query } },
              { title: { contains: body.query } },
            ],
          }),
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
        },
        orderBy:
          body.sort_by === "priority"
            ? { priority: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "case_number"
              ? { case_number: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
        skip,
        take: limit,
      }),

      MyGlobal.prisma.econ_political_forum_moderation_cases.count({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.priority !== undefined && { priority: body.priority }),
          ...(body.assigned_moderator_id !== undefined && {
            assigned_moderator_id: body.assigned_moderator_id,
          }),
          ...(body.owner_admin_id !== undefined && {
            owner_admin_id: body.owner_admin_id,
          }),
          ...(body.case_number !== undefined && {
            case_number: body.case_number,
          }),
          ...(body.legal_hold !== undefined && { legal_hold: body.legal_hold }),
          ...(body.query && {
            OR: [
              { summary: { contains: body.query } },
              { title: { contains: body.query } },
            ],
          }),
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
        },
      }),
    ]);

    // Audit the admin access to moderation cases listing
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: administrator.id,
        action_type: "read_moderation_cases",
        target_type: "moderation_case_listing",
        details: JSON.stringify({ filters: body }),
        created_at: toISOStringSafe(new Date()),
        created_by_system: false,
      },
    });

    // Map results to summary DTO with proper null/undefined handling and date conversions
    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      case_number: r.case_number,
      title: r.title ?? undefined,
      status: r.status,
      priority: r.priority,
      assigned_moderator_id:
        r.assigned_moderator_id === null
          ? null
          : (r.assigned_moderator_id as string & tags.Format<"uuid">),
      owner_admin_id:
        r.owner_admin_id === null
          ? null
          : (r.owner_admin_id as string & tags.Format<"uuid">),
      lead_report_id:
        r.lead_report_id === null
          ? null
          : (r.lead_report_id as string & tags.Format<"uuid">),
      legal_hold: r.legal_hold,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
      closed_at: r.closed_at ? toISOStringSafe(r.closed_at) : null,
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
  } catch (err) {
    // Preserve original error message for debugging while returning generic message
    const message =
      err instanceof Error ? `${err.message}` : "Internal Server Error";
    throw new HttpException(message, 500);
  }
}
