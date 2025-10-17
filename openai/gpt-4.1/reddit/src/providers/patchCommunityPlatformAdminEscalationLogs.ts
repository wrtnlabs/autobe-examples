import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import { IPageICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEscalationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminEscalationLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformEscalationLog.IRequest;
}): Promise<IPageICommunityPlatformEscalationLog.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;
  const skip = (page - 1) * limit;

  // ALLOWED sort fields (event_time does not exist in schema - will not use)
  const allowedSortFields = ["created_at", "updated_at", "status"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sort_order =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Date range (created_at)
  let createdAt: { gte?: string; lte?: string } = {};
  if (body.date_from !== undefined && body.date_from !== null) {
    createdAt.gte = body.date_from;
  }
  if (body.date_to !== undefined && body.date_to !== null) {
    createdAt.lte = body.date_to;
  }
  const createdAtFilter =
    createdAt.gte || createdAt.lte ? createdAt : undefined;

  // Build where condition
  const where = {
    ...(body.initiator_id !== undefined && { initiator_id: body.initiator_id }),
    ...(body.destination_admin_id !== undefined &&
      body.destination_admin_id !== null && {
        destination_admin_id: body.destination_admin_id,
      }),
    ...(body.report_id !== undefined &&
      body.report_id !== null && { report_id: body.report_id }),
    ...(body.status !== undefined && { status: body.status }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
  };

  // Inline orderBy for Prisma type inference
  const orderBy =
    sort_by === "updated_at"
      ? { updated_at: sort_order }
      : sort_by === "status"
        ? { status: sort_order }
        : { created_at: sort_order };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_escalation_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        initiator_id: true,
        destination_admin_id: true,
        report_id: true,
        escalation_reason: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_escalation_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      initiator_id: row.initiator_id,
      destination_admin_id: row.destination_admin_id ?? undefined,
      report_id: row.report_id,
      escalation_reason: row.escalation_reason,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: row.updated_at ? toISOStringSafe(row.updated_at) : undefined,
    })),
  };
}
