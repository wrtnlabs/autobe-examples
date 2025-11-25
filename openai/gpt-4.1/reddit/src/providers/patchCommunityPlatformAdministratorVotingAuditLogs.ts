import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAuditLog";
import { IPageICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorVotingAuditLogs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformVotingAuditLog.IRequest;
}): Promise<IPageICommunityPlatformVotingAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort_order ?? "desc";

  // Build where clause for Prisma
  const where = {
    ...(props.body.user_id
      ? { community_platform_user_id: props.body.user_id }
      : {}),
    ...(props.body.target_type ? { target_type: props.body.target_type } : {}),
    ...(props.body.target_id ? { target_id: props.body.target_id } : {}),
    ...(props.body.vote_type ? { vote_type: props.body.vote_type } : {}),
    ...(props.body.result_status
      ? { result_status: props.body.result_status }
      : {}),
    ...(props.body.reason ? { reason: props.body.reason } : {}),
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.session_id ? { session_id: props.body.session_id } : {}),
    ...(props.body.start_date || props.body.end_date
      ? {
          created_at: {
            ...(props.body.start_date ? { gte: props.body.start_date } : {}),
            ...(props.body.end_date ? { lte: props.body.end_date } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_voting_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: sortOrder },
    }),
    MyGlobal.prisma.community_platform_voting_audit_logs.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      community_platform_user_id: log.community_platform_user_id,
      target_type: typia.assert<"post" | "comment">(log.target_type),
      target_id: log.target_id,
      vote_type: typia.assert<"up" | "down" | "remove">(log.vote_type),
      result_status: typia.assert<
        "rejected" | "accepted" | "reversed" | "rate_limited"
      >(log.result_status),
      reason: typeof log.reason === "undefined" ? undefined : log.reason,
      ip: typeof log.ip === "undefined" ? undefined : log.ip,
      session_id:
        typeof log.session_id === "undefined" ? undefined : log.session_id,
      created_at: toISOStringSafe(log.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
