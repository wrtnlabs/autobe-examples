import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build shared WHERE conditions
  const whereAuditLogs = {
    ...(props.body.actorType && { actor_type: props.body.actorType }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.targetType && { target_type: props.body.targetType }),
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    ...(props.body.startDate && { created_at: { gte: props.body.startDate } }),
    ...(props.body.endDate && { created_at: { lte: props.body.endDate } }),
    ...(props.body.searchText && {
      OR: [{ action_details: { contains: props.body.searchText } }],
    }),
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  const whereSystemAuditLogs = {
    ...(props.body.actorType && { actor_type: props.body.actorType }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.targetType && { target_type: props.body.targetType }),
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    ...(props.body.startDate && { created_at: { gte: props.body.startDate } }),
    ...(props.body.endDate && { created_at: { lte: props.body.endDate } }),
    ...(props.body.searchText && {
      OR: [{ action_description: { contains: props.body.searchText } }],
    }),
    deleted_at: null,
  } satisfies Prisma.discussion_board_system_audit_logsWhereInput;
  // Query counts
  const [countAuditLogs, countSystemAuditLogs] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.count({
      where: whereAuditLogs,
    }),
    MyGlobal.prisma.discussion_board_system_audit_logs.count({
      where: whereSystemAuditLogs,
    }),
  ]);
  const total = countAuditLogs + countSystemAuditLogs;
  // Query data from both tables with same pagination
  const [auditLogs, systemAuditLogs] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where: whereAuditLogs,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_audit_logs.findMany({
      where: whereSystemAuditLogs,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        actor_type: true,
        target_type: true,
        action_type: true,
        created_at: true,
      },
    }),
  ]);
  // Transform audit logs using transformer
  const transformedAuditLogs = await ArrayUtil.asyncMap(
    auditLogs,
    DiscussionBoardAuditLogAtSummaryTransformer.transform,
  );
  // Transform system audit logs (no transformer available)
  const transformedSystemLogs = systemAuditLogs.map(
    (log) =>
      ({
        id: log.id as string & tags.Format<"uuid">,
        actor_type: log.actor_type,
        target_type: log.target_type ?? "",
        action_type: log.action_type,
        created_at: toISOStringSafe(log.created_at),
      }) satisfies IDiscussionBoardAuditLog.ISummary,
  );
  // Combine and sort by created_at descending (most recent first)
  const combined = [...transformedAuditLogs, ...transformedSystemLogs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  return {
    data: combined,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
