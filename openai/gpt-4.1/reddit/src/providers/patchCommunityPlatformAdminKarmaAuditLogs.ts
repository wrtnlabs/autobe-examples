import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAuditLogs";
import { IPageICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaAuditLogs";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaAuditLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaAuditLogs.IRequest;
}): Promise<IPageICommunityPlatformKarmaAuditLogs.ISummary> {
  const { body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.user_id !== undefined && {
      community_platform_user_id: body.user_id,
    }),
    ...(body.action !== undefined && { action: body.action }),
    ...(body.content_reference_id !== undefined && {
      content_reference_id: body.content_reference_id,
    }),
    ...(body.score_delta_min !== undefined &&
      body.score_delta_max !== undefined && {
        score_delta: {
          gte: body.score_delta_min,
          lte: body.score_delta_max,
        },
      }),
    ...(body.score_delta_min !== undefined &&
      body.score_delta_max === undefined && {
        score_delta: { gte: body.score_delta_min },
      }),
    ...(body.score_delta_max !== undefined &&
      body.score_delta_min === undefined && {
        score_delta: { lte: body.score_delta_max },
      }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_karma_audit_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_user_id: row.community_platform_user_id,
    action: row.action,
    reason: row.reason,
    score_delta: row.score_delta,
    prior_karma: row.prior_karma,
    resulting_karma: row.resulting_karma,
    content_reference_id: row.content_reference_id ?? null,
    performed_by_user_id: row.performed_by_user_id ?? null,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
