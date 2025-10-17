import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import { IPageIEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorModerationLogs(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumModerationLog.IRequest;
}): Promise<IPageIEconPoliticalForumModerationLog.ISummary> {
  const { administrator, body } = props;

  try {
    // Authorization: ensure the administrator record exists and is active
    await MyGlobal.prisma.econ_political_forum_administrator.findFirstOrThrow({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });

    const page = Number(body.page ?? 1);
    const limit = Math.min(Number(body.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const correlation_id = v4() as string & tags.Format<"uuid">;

    // Ensure sort direction has the exact Prisma SortOrder type
    const sortDir = (
      body.sortOrder === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    const orderBy: Prisma.econ_political_forum_moderation_logsOrderByWithRelationInput =
      body.sortBy === "moderator_id"
        ? { moderator_id: sortDir }
        : body.sortBy === "action_type"
          ? { action_type: sortDir }
          : { created_at: sortDir };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_moderation_logs.findMany({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.action_type !== undefined && {
            action_type: body.action_type,
          }),
          ...(body.reason_code !== undefined && {
            reason_code: body.reason_code,
          }),
          ...(body.moderator_id !== undefined &&
            body.moderator_id !== null && { moderator_id: body.moderator_id }),
          ...(body.acted_admin_id !== undefined &&
            body.acted_admin_id !== null && {
              acted_admin_id: body.acted_admin_id,
            }),
          ...(body.target_post_id !== undefined &&
            body.target_post_id !== null && {
              target_post_id: body.target_post_id,
            }),
          ...(body.target_thread_id !== undefined &&
            body.target_thread_id !== null && {
              target_thread_id: body.target_thread_id,
            }),
          ...(body.moderation_case_id !== undefined &&
            body.moderation_case_id !== null && {
              moderation_case_id: body.moderation_case_id,
            }),
          ...(body.query !== undefined && body.query !== null
            ? {
                OR: [
                  { rationale: { contains: body.query } },
                  { evidence_reference: { contains: body.query } },
                ],
              }
            : {}),
          ...((body.created_from !== undefined && body.created_from !== null) ||
          (body.created_to !== undefined && body.created_to !== null) ||
          (body.cursor !== undefined && body.cursor !== null)
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
                  ...(body.cursor !== undefined &&
                    body.cursor !== null &&
                    (body.sortOrder === "asc"
                      ? { gt: toISOStringSafe(body.cursor) }
                      : { lt: toISOStringSafe(body.cursor) })),
                },
              }
            : {}),
        },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          action_type: true,
          reason_code: true,
          moderator_id: true,
          acted_admin_id: true,
          target_post_id: true,
          target_thread_id: true,
          moderation_case_id: true,
          rationale: true,
          evidence_reference: true,
          created_at: true,
        },
      }),

      MyGlobal.prisma.econ_political_forum_moderation_logs.count({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.action_type !== undefined && {
            action_type: body.action_type,
          }),
          ...(body.reason_code !== undefined && {
            reason_code: body.reason_code,
          }),
          ...(body.moderator_id !== undefined &&
            body.moderator_id !== null && { moderator_id: body.moderator_id }),
          ...(body.acted_admin_id !== undefined &&
            body.acted_admin_id !== null && {
              acted_admin_id: body.acted_admin_id,
            }),
          ...(body.target_post_id !== undefined &&
            body.target_post_id !== null && {
              target_post_id: body.target_post_id,
            }),
          ...(body.target_thread_id !== undefined &&
            body.target_thread_id !== null && {
              target_thread_id: body.target_thread_id,
            }),
          ...(body.moderation_case_id !== undefined &&
            body.moderation_case_id !== null && {
              moderation_case_id: body.moderation_case_id,
            }),
          ...(body.query !== undefined && body.query !== null
            ? {
                OR: [
                  { rationale: { contains: body.query } },
                  { evidence_reference: { contains: body.query } },
                ],
              }
            : {}),
          ...((body.created_from !== undefined && body.created_from !== null) ||
          (body.created_to !== undefined && body.created_to !== null) ||
          (body.cursor !== undefined && body.cursor !== null)
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
                  ...(body.cursor !== undefined &&
                    body.cursor !== null &&
                    (body.sortOrder === "asc"
                      ? { gt: toISOStringSafe(body.cursor) }
                      : { lt: toISOStringSafe(body.cursor) })),
                },
              }
            : {}),
        },
      }),
    ]);

    // Audit administrator access (unredacted) with correlation id
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: administrator.id,
        action_type: "access_moderation_logs",
        target_type: "moderation_logs",
        target_identifier: null,
        details: JSON.stringify({
          correlation_id,
          includeDeleted: !!body.includeDeleted,
          filters: {
            action_type: body.action_type ?? null,
            reason_code: body.reason_code ?? null,
            moderator_id: body.moderator_id ?? null,
          },
        }),
        created_at: toISOStringSafe(new Date()),
        created_by_system: false,
      },
    });

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      action_type: r.action_type,
      reason_code: r.reason_code,
      moderator_id: r.moderator_id ?? null,
      acted_admin_id: r.acted_admin_id ?? null,
      target_post_id: r.target_post_id ?? null,
      target_thread_id: r.target_thread_id ?? null,
      moderation_case_id: r.moderation_case_id ?? null,
      rationale: r.rationale ?? undefined,
      evidence_reference: r.evidence_reference ?? undefined,
      created_at: toISOStringSafe(r.created_at),
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
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
