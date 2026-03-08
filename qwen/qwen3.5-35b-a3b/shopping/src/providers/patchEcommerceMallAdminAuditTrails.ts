import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAuditTrails(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "timestamp";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const prismaSortOrder = sortOrder.toLowerCase() as "asc" | "desc";
  const adminLogsDateFilter = props.body.dateRange
    ? buildAdminLogsDateFilter(props.body.dateRange)
    : {};
  const snapshotAuditsDateFilter = props.body.dateRange
    ? buildSnapshotAuditsDateFilter(props.body.dateRange)
    : {};
  const adminLogsWhere: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    admin_id: props.body.adminId ?? props.admin.id,
    ...adminLogsDateFilter,
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.entityType && { target_entity_type: props.body.entityType }),
    ...(props.body.entityId && { target_entity_id: props.body.entityId }),
  };
  const snapshotAuditsWhere: Prisma.ecommerce_mall_snapshot_auditsWhereInput = {
    ...snapshotAuditsDateFilter,
    ...(props.body.changedBy && { changed_by: props.body.changedBy }),
    ...(props.body.recordType && { record_type: props.body.recordType }),
    ...(props.body.entityId && { record_id: props.body.entityId }),
  };
  const [adminLogsResult, adminLogsTotal] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: adminLogsWhere,
      skip,
      take: limit,
      orderBy: {
        created_at: prismaSortOrder,
      },
      select: {
        id: true,
        admin_id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        changes: true,
        request_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
      where: adminLogsWhere,
    }),
  ]);
  const adminIds = [...new Set(adminLogsResult.map((log) => log.admin_id))];
  const admins = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: { id: { in: adminIds } },
    select: {
      id: true,
      email: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
    },
  });
  const adminMap = new Map(admins.map((a) => [a.id, a]));
  const [snapshotAuditsResult, snapshotAuditsTotal] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
      where: snapshotAuditsWhere,
      skip,
      take: limit,
      orderBy: {
        changed_at: prismaSortOrder,
      },
      select: {
        id: true,
        record_type: true,
        record_id: true,
        changes: true,
        old_values: true,
        new_values: true,
        changed_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_snapshot_audits.count({
      where: snapshotAuditsWhere,
    }),
  ]);
  const adminLogs = adminLogsResult.map((log) => {
    const admin = adminMap.get(log.admin_id);
    const user = admin
      ? ({
          id: admin.id,
          email: admin.email,
          is_banned: admin.is_banned,
          created_at: admin.created_at.toISOString(),
          updated_at: admin.updated_at.toISOString(),
        } satisfies IEcommerceMallAdmin.ISummary)
      : "snapshot_audit";
    return {
      id: log.id,
      type: "admin_log" as const,
      timestamp: log.created_at.toISOString(),
      user: user,
      operationType: log.action_type,
      recordType: log.target_entity_type ?? undefined,
      entityType: log.target_entity_type ?? "",
      entityId: log.target_entity_id as string & tags.Format<"uuid">,
      recordId: log.request_id as (string & tags.Format<"uuid">) | undefined,
      changes: log.changes ?? "",
      status: "active",
    } satisfies IEcommerceMallAdminAuditLog.ISummary;
  });
  const snapshotAudits = snapshotAuditsResult.map((audit) => {
    const changes: IEcommerceMallAdminAuditLog.IChange =
      audit.changes && audit.old_values && audit.new_values
        ? {
            oldValues: audit.old_values ? JSON.parse(audit.old_values) : {},
            newValues: audit.new_values ? JSON.parse(audit.new_values) : {},
          }
        : { oldValues: {}, newValues: {} };
    return {
      id: audit.id,
      type: "snapshot_audit" as const,
      timestamp: audit.changed_at.toISOString(),
      user: "snapshot_audit",
      operationType: audit.record_type,
      recordType: audit.record_type ?? undefined,
      entityType: audit.record_type ?? "",
      entityId: audit.record_id as string & tags.Format<"uuid">,
      recordId: audit.record_id as (string & tags.Format<"uuid">) | undefined,
      changes: changes,
      status: "active",
    } satisfies IEcommerceMallAdminAuditLog.ISummary;
  });
  const allData = [...adminLogs, ...snapshotAudits];
  const sortedData = sortAuditData(allData, sortBy, prismaSortOrder);
  const paginatedData = sortedData.slice(skip, skip + limit);
  const total = adminLogsTotal + snapshotAuditsTotal;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIEcommerceMallAdminAuditLog.ISummary;
}
function buildAdminLogsDateFilter(
  dateRange: IEcommerceMallAdminAuditLog.IDateRangeFilter,
): Record<string, unknown> {
  if (!dateRange) return {};
  const dates = dateRange.dates;
  switch (dateRange.filterType) {
    case "between":
      if (dates.length < 2) return {};
      return { created_at: { gte: dates[0], lte: dates[1] } };
    case "before":
      return { created_at: { lte: dates[0] } };
    case "after":
      return { created_at: { gte: dates[0] } };
    case "within_range":
      if (dates.length < 2) return {};
      return { created_at: { gte: dates[0], lte: dates[dates.length - 1] } };
    case "specific_date":
      return { created_at: { equals: dates[0] } };
    case "since":
      return { created_at: { gte: dates[0] } };
    case "until":
      return { created_at: { lte: dates[0] } };
    default:
      return {};
  }
}
function buildSnapshotAuditsDateFilter(
  dateRange: IEcommerceMallAdminAuditLog.IDateRangeFilter,
): Record<string, unknown> {
  if (!dateRange) return {};
  const dates = dateRange.dates;
  switch (dateRange.filterType) {
    case "between":
      if (dates.length < 2) return {};
      return { changed_at: { gte: dates[0], lte: dates[1] } };
    case "before":
      return { changed_at: { lte: dates[0] } };
    case "after":
      return { changed_at: { gte: dates[0] } };
    case "within_range":
      if (dates.length < 2) return {};
      return { changed_at: { gte: dates[0], lte: dates[dates.length - 1] } };
    case "specific_date":
      return { changed_at: { equals: dates[0] } };
    case "since":
      return { changed_at: { gte: dates[0] } };
    case "until":
      return { changed_at: { lte: dates[0] } };
    default:
      return {};
  }
}
function sortAuditData(
  data: IEcommerceMallAdminAuditLog.ISummary[],
  sortBy: string,
  sortOrder: "asc" | "desc",
): IEcommerceMallAdminAuditLog.ISummary[] {
  return [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "timestamp":
        comparison =
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case "operationType":
        comparison = (a.operationType ?? "").localeCompare(
          b.operationType ?? "",
        );
        break;
      case "adminId":
        const adminA =
          a.user === "snapshot_audit"
            ? ""
            : (a.user as IEcommerceMallAdmin.ISummary).id;
        const adminB =
          b.user === "snapshot_audit"
            ? ""
            : (b.user as IEcommerceMallAdmin.ISummary).id;
        comparison = adminA.localeCompare(adminB);
        break;
      case "changedBy":
        comparison = 0;
        break;
      case "recordType":
        comparison = (a.recordType ?? "").localeCompare(b.recordType ?? "");
        break;
      case "entityType":
        comparison = a.entityType.localeCompare(b.entityType);
        break;
      default:
        comparison =
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
}
