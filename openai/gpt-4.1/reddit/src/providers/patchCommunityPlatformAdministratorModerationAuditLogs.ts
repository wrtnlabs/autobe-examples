import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorModerationAuditLogs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformModerationAuditLog.IRequest;
}): Promise<IPageICommunityPlatformModerationAuditLog.ISummary> {
  const {
    event_type,
    moderation_action_id,
    report_id,
    actor_moderator_id,
    actor_administrator_id,
    event_reason,
    created_at_start,
    created_at_end,
    sort_by,
    sort_order,
    page,
    limit,
  } = props.body;

  const where = {
    ...(event_type !== undefined && { event_type }),
    ...(moderation_action_id !== undefined && { moderation_action_id }),
    ...(report_id !== undefined && { report_id }),
    ...(actor_moderator_id !== undefined && { actor_moderator_id }),
    ...(actor_administrator_id !== undefined && { actor_administrator_id }),
    ...(event_reason !== undefined && {
      event_reason: { contains: event_reason },
    }),
    ...(created_at_start || created_at_end
      ? {
          created_at: {
            ...(created_at_start !== undefined && { gte: created_at_start }),
            ...(created_at_end !== undefined && { lte: created_at_end }),
          },
        }
      : {}),
  };

  const finalSortBy = sort_by ?? "created_at";
  const finalSortOrder = sort_order ?? "desc";

  const pageValue = page ?? 1;
  const limitValue = limit ?? 100;
  const skipValue = (pageValue - 1) * limitValue;

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_audit_logs.findMany({
      where,
      skip: skipValue,
      take: limitValue,
      orderBy: { [finalSortBy]: finalSortOrder },
      include: {
        moderationAction: true,
        report: true,
        actorModerator: true,
        actorAdministrator: true,
      },
    }),
    MyGlobal.prisma.community_platform_moderation_audit_logs.count({ where }),
  ]);

  const data = logs.map((log) => ({
    id: log.id,
    moderation_action: log.moderationAction
      ? { id: log.moderationAction.id }
      : { id: log.moderation_action_id },
    report:
      log.report !== undefined && log.report !== null
        ? { id: log.report.id }
        : undefined,
    actor_moderator:
      log.actorModerator !== undefined && log.actorModerator !== null
        ? { id: log.actorModerator.id }
        : undefined,
    actor_administrator:
      log.actorAdministrator !== undefined && log.actorAdministrator !== null
        ? { id: log.actorAdministrator.id }
        : undefined,
    event_type: log.event_type,
    event_reason: log.event_reason ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: pageValue,
      limit: limitValue,
      records: total,
      pages: Math.ceil(total / limitValue),
    },
    data,
  };
}
