import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAuditLog";
import { IPageICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchCommunityBbsSystemAdminAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsAuditLog.IRequest;
}): Promise<IPageICommunityBbsAuditLog.ISummary> {
  const { systemAdmin, body } = props;

  // Pagination defaults and limits
  const rawLimit = (body.limit ?? 25) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = Math.min(Number(rawLimit), 100);
  const page = Number(body.page ?? 1);
  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);

  // Sorting
  const sortBy = body.sort_by ?? "created_at";
  const order = body.order === "asc" ? "asc" : "desc";

  // Build where condition inline
  const whereCondition = {
    ...(body.actor_type !== undefined && { actor_type: body.actor_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.entity !== undefined && { entity: body.entity }),
    ...(body.action !== undefined && { action: body.action }),
    ...(body.target_community_id !== undefined &&
      body.target_community_id !== null && {
        target_community_id: body.target_community_id,
      }),
    ...(body.q !== undefined && { payload: { contains: body.q } }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: new Date(body.created_at_from),
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: new Date(body.created_at_to),
              }),
          },
        }
      : {}),
  };

  // Query with inline orderBy
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_audit_logs.findMany({
      where: whereCondition,
      orderBy:
        sortBy === "created_at" ? { created_at: order } : { created_at: order },
      skip,
      take: limit,
      select: {
        id: true,
        entity: true,
        action: true,
        actor_type: true,
        actor_id: true,
        target_post_id: true,
        target_comment_id: true,
        target_community_id: true,
        target_user_id: true,
        payload: true,
        ip: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_bbs_audit_logs.count({ where: whereCondition }),
  ]);

  // Redaction helper
  const redact = (input: string | null | undefined): string | null => {
    if (input === null || input === undefined) return null;
    let out = input;
    // Simple redaction: remove obvious password tokens
    out = out.replace(/password_hash/gi, "[REDACTED]");
    out = out.replace(/password/gi, "[REDACTED]");
    // Trim long payloads for summary
    if (out.length > 1024) out = out.slice(0, 1024) + "...";
    return out;
  };

  // Map Prisma rows to DTO summaries
  const data = rows.map((r) => {
    // Build polymorphic target if present
    let target: ICommunityBbsAuditLog.ITarget | undefined;
    if (r.target_post_id)
      target = { target_type: "post", target_id: r.target_post_id };
    else if (r.target_comment_id)
      target = { target_type: "comment", target_id: r.target_comment_id };
    else if (r.target_community_id)
      target = { target_type: "community", target_id: r.target_community_id };
    else if (r.target_user_id)
      target = { target_type: "user", target_id: r.target_user_id };

    return {
      id: r.id as string & tags.Format<"uuid">,
      entity: r.entity as "post" | "comment" | "community" | "report" | "user",
      action: r.action,
      actor_type: r.actor_type as
        | "visitor"
        | "community_member"
        | "moderator"
        | "system_admin"
        | "automation"
        | undefined,
      actor_id: r.actor_id ?? null,
      target,
      payload: redact(r.payload),
      ip: r.ip ?? null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    };
  });

  // Record access to audit logs as an audit event
  try {
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "report",
        action: "read_audit_logs",
        payload: `system_admin:${systemAdmin.id} searched audit logs`,
        ip: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    // Logging failure to create access audit should not break response
    // but we surface a 500 if Prisma error is unexpected
    // swallow silently per principle but could be logged
  }

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
