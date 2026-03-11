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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for discussion_board_audit_logs
  const adminAuditWhere = {
    ...(props.body.actorType && { actor_type: props.body.actorType }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.targetType && { target_type: props.body.targetType }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    ...(props.body.searchText && {
      OR: [{ action_details: { contains: props.body.searchText } }],
    }),
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  // Build WHERE conditions for system audit logs
  const systemAuditWhere = {
    deleted_at: null, // Filter out deleted system audit logs
    ...(props.body.actorType && { actor_type: props.body.actorType }),
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.targetType && { target_type: props.body.targetType }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    ...(props.body.searchText && {
      OR: [{ action_description: { contains: props.body.searchText } }],
    }),
  } satisfies Prisma.discussion_board_system_audit_logsWhereInput;
  // Query both tables with count for pagination
  const [adminAuditLogs, adminCount, systemAuditLogs, systemCount] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_audit_logs.findMany({
        where: adminAuditWhere,
        include: {
          administrativeHistory: true,
        },
      }),
      MyGlobal.prisma.discussion_board_audit_logs.count({
        where: adminAuditWhere,
      }),
      MyGlobal.prisma.discussion_board_system_audit_logs.findMany({
        where: systemAuditWhere,
      }),
      MyGlobal.prisma.discussion_board_system_audit_logs.count({
        where: systemAuditWhere,
      }),
    ]);
  // Combine and sort all results by created_at descending
  const combinedResults = [
    ...adminAuditLogs.map((log) => ({
      ...log,
      source: "admin" as const,
    })),
    ...systemAuditLogs.map((log) => ({
      ...log,
      source: "system" as const,
    })),
  ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  // Apply pagination
  const paginatedResults = combinedResults.slice(skip, skip + limit);
  // Transform admin audit logs using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    paginatedResults.filter((r) => r.source === "admin"),
    async (log) => {
      // Since we filtered to only 'admin' logs, no need for system check
      return DiscussionBoardAuditLogAtSummaryTransformer.transform(log);
    },
  );
  const totalRecords = adminCount + systemCount;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
  };
}
