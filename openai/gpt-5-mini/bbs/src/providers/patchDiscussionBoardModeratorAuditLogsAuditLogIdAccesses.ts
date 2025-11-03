import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLogAccess";
import { IPageIDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLogAccess";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorAuditLogsAuditLogIdAccesses(props: {
  moderator: ModeratorPayload;
  auditLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAuditLogAccess.IRequest;
}): Promise<IPageIDiscussionBoardAuditLogAccess.ISummary> {
  const { moderator, auditLogId, body } = props;

  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true },
    });
  if (!moderatorRecord) throw new HttpException("Unauthorized", 401);

  const auditLog = await MyGlobal.prisma.discussion_board_audit_logs.findUnique(
    {
      where: { id: auditLogId },
      select: {
        id: true,
        event_type: true,
        event_timestamp: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!auditLog) throw new HttpException("Not Found", 404);

  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    discussion_board_audit_log_id: auditLogId,
  };
  if (body.accessorType !== undefined) where.accessor_type = body.accessorType;
  if (body.accessorId !== undefined && body.accessorId !== null)
    where.accessor_id = body.accessorId;
  if (body.accessPurpose !== undefined && body.accessPurpose !== null)
    where.access_purpose = body.accessPurpose;

  if (
    (body.accessedFrom !== undefined && body.accessedFrom !== null) ||
    (body.accessedTo !== undefined && body.accessedTo !== null)
  ) {
    const accessedAt: Record<string, unknown> = {};
    if (body.accessedFrom !== undefined && body.accessedFrom !== null)
      accessedAt.gte = toISOStringSafe(body.accessedFrom);
    if (body.accessedTo !== undefined && body.accessedTo !== null)
      accessedAt.lte = toISOStringSafe(body.accessedTo);
    if (Object.keys(accessedAt).length > 0) where.accessed_at = accessedAt;
  }

  const orderBy = body.sortBy
    ? body.sortBy === "accessedAt" || body.sortBy === "-accessedAt"
      ? body.sortBy.startsWith("-")
        ? { accessed_at: "desc" as Prisma.SortOrder }
        : { accessed_at: "asc" as Prisma.SortOrder }
      : body.sortBy === "createdAt" || body.sortBy === "-createdAt"
        ? body.sortBy.startsWith("-")
          ? { created_at: "desc" as Prisma.SortOrder }
          : { created_at: "asc" as Prisma.SortOrder }
        : { accessed_at: "desc" as Prisma.SortOrder }
    : { accessed_at: "desc" as Prisma.SortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_log_accesses.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_audit_log_accesses.count({ where }),
  ]);

  const envAllowsUnredacted = Boolean(
    (MyGlobal.env as any)?.UNREDACTED_AUDIT === "true",
  );

  const data: IDiscussionBoardAuditLogAccess.ISummary[] = await Promise.all(
    rows.map(async (r) => {
      const canViewPII =
        envAllowsUnredacted ||
        (r.accessor_id !== null && r.accessor_id === moderator.id);

      let accessorSummary:
        | IDiscussionBoardMember.ISummary
        | IDiscussionBoardModerator.ISummary
        | null = null;
      if (r.accessor_type === "moderator" && r.accessor_id) {
        const mod = await MyGlobal.prisma.discussion_board_moderator.findUnique(
          {
            where: { id: r.accessor_id },
            select: {
              id: true,
              username: true,
              display_name: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        );
        if (mod) {
          accessorSummary = {
            id: mod.id as string & tags.Format<"uuid">,
            username: mod.username,
            display_name: mod.display_name ?? null,
            created_at: toISOStringSafe(mod.created_at),
            updated_at: toISOStringSafe(mod.updated_at),
            deleted_at: mod.deleted_at ? toISOStringSafe(mod.deleted_at) : null,
          } as IDiscussionBoardModerator.ISummary;
        }
      }

      const auditSummary: IDiscussionBoardAuditLog.ISummary = {
        id: auditLog.id as string & tags.Format<"uuid">,
        event_type: auditLog.event_type,
        event_timestamp: toISOStringSafe(auditLog.event_timestamp),
        created_at: toISOStringSafe(auditLog.created_at),
        updated_at: auditLog.updated_at
          ? toISOStringSafe(auditLog.updated_at)
          : null,
        deleted_at: (auditLog as any).deleted_at
          ? toISOStringSafe((auditLog as any).deleted_at)
          : null,
      } as IDiscussionBoardAuditLog.ISummary;

      const summary: IDiscussionBoardAuditLogAccess.ISummary = {
        id: r.id as string & tags.Format<"uuid">,
        accessed_at: toISOStringSafe(r.accessed_at),
        accessor_type: r.accessor_type,
        accessor_id: canViewPII
          ? (r.accessor_id as string & tags.Format<"uuid">)
          : null,
        accessor: accessorSummary ?? undefined,
        accessor_role: r.accessor_role ?? undefined,
        access_purpose: r.access_purpose ?? undefined,
        ip: canViewPII ? (r.ip ?? null) : null,
        user_agent: canViewPII ? (r.user_agent ?? null) : null,
        audit_log: auditSummary,
        created_at: toISOStringSafe(r.created_at),
      };

      return summary;
    }),
  );

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
