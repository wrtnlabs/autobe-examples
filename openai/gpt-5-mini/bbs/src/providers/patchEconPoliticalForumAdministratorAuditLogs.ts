import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import { IPageIEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumAuditLog.IRequest;
}): Promise<IPageIEconPoliticalForumAuditLog> {
  const { administrator, body } = props;

  if (!administrator || administrator.type !== "administrator")
    throw new HttpException("Unauthorized", 403);

  const page = Number(body.page ?? 1);
  const limitRequested = Number(body.limit ?? 20);
  const limit = Math.max(1, Math.min(limitRequested, 100));

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_audit_logs.findMany({
      where: {
        ...(body.action_type !== undefined &&
          body.action_type !== null && { action_type: body.action_type }),
        ...(body.target_type !== undefined &&
          body.target_type !== null && { target_type: body.target_type }),
        ...(body.target_identifier !== undefined &&
          body.target_identifier !== null && {
            target_identifier: body.target_identifier,
          }),
        ...(body.created_by_system !== undefined &&
          body.created_by_system !== null && {
            created_by_system: body.created_by_system,
          }),
        ...((body.created_from !== undefined && body.created_from !== null) ||
        (body.created_to !== undefined && body.created_to !== null)
          ? {
              created_at: {
                ...(body.created_from !== undefined &&
                  body.created_from !== null && { gte: body.created_from }),
                ...(body.created_to !== undefined &&
                  body.created_to !== null && { lte: body.created_to }),
              },
            }
          : {}),
        ...(body.query !== undefined &&
          body.query !== null && { details: { contains: body.query } }),
      },
      orderBy: { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_audit_logs.count({
      where: {
        ...(body.action_type !== undefined &&
          body.action_type !== null && { action_type: body.action_type }),
        ...(body.target_type !== undefined &&
          body.target_type !== null && { target_type: body.target_type }),
        ...(body.target_identifier !== undefined &&
          body.target_identifier !== null && {
            target_identifier: body.target_identifier,
          }),
        ...(body.created_by_system !== undefined &&
          body.created_by_system !== null && {
            created_by_system: body.created_by_system,
          }),
        ...((body.created_from !== undefined && body.created_from !== null) ||
        (body.created_to !== undefined && body.created_to !== null)
          ? {
              created_at: {
                ...(body.created_from !== undefined &&
                  body.created_from !== null && { gte: body.created_from }),
                ...(body.created_to !== undefined &&
                  body.created_to !== null && { lte: body.created_to }),
              },
            }
          : {}),
        ...(body.query !== undefined &&
          body.query !== null && { details: { contains: body.query } }),
      },
    }),
  ]);

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "audit_log_search",
      target_type: "audit_logs",
      target_identifier: "search",
      details: JSON.stringify({
        note: "admin search",
        filters: body,
        redacted: true,
      }),
      created_at: toISOStringSafe(new Date()),
      created_by_system: true,
    },
  });

  const data = rows.map((r) => ({
    id: r.id,
    registereduser_id: r.registereduser_id ?? null,
    moderator_id: r.moderator_id ?? null,
    post_id: r.post_id ?? null,
    thread_id: r.thread_id ?? null,
    report_id: r.report_id ?? null,
    moderation_case_id: r.moderation_case_id ?? null,
    action_type: r.action_type,
    target_type: r.target_type,
    target_identifier: r.target_identifier ?? null,
    details: null,
    created_at: toISOStringSafe(r.created_at),
    created_by_system: r.created_by_system,
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
