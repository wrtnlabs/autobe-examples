import { IEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAuditTrailAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAuditTrailAnalytic";
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

export async function patchEcommerceMallAdminAuditTrailsAnalytics(props: {
  admin: AdminPayload;
  body: IEcommerceMallAuditTrailAnalytic.IRequest;
}): Promise<IPageIEcommerceMallAuditTrailAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 50;
  const skip = (page - 1) * limit;
  const whereConditions: Array<Prisma.ecommerce_mall_admin_audit_logsWhereInput> =
    [];
  if (props.body.dateRange?.startDate) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.dateRange.startDate) },
    });
  }
  if (props.body.dateRange?.endDate) {
    whereConditions.push({
      created_at: { lte: new Date(props.body.dateRange.endDate) },
    });
  }
  if (props.body.actionTypes && props.body.actionTypes.length > 0) {
    whereConditions.push({ action_type: { in: props.body.actionTypes } });
  }
  if (props.body.adminIds && props.body.adminIds.length > 0) {
    whereConditions.push({ admin_id: { in: props.body.adminIds } });
  }
  if (props.body.targetEntityTypes && props.body.targetEntityTypes.length > 0) {
    whereConditions.push({
      target_entity_type: { in: props.body.targetEntityTypes },
    });
  }
  const where: Prisma.ecommerce_mall_admin_audit_logsWhereInput =
    whereConditions.length === 0 ? {} : { AND: whereConditions };
  const totalRecords =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({ where });
  const logs = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      admin_id: true,
      action_type: true,
      target_entity_type: true,
      created_at: true,
    },
  });
  const actionTypeDistribution: Record<string, number> = {};
  const adminActivityMap: Record<
    string,
    {
      count: number;
      firstAt: string;
      lastAt: string;
    }
  > = {};
  const entityDistribution: Record<string, number> = {};
  let earliestDate: string | null = null;
  let latestDate: string | null = null;
  for (const log of logs) {
    const createdAt = toISOStringSafe(log.created_at);
    actionTypeDistribution[log.action_type] =
      (actionTypeDistribution[log.action_type] ?? 0) + 1;
    if (!adminActivityMap[log.admin_id]) {
      adminActivityMap[log.admin_id] = {
        count: 0,
        firstAt: createdAt,
        lastAt: createdAt,
      };
    }
    if (createdAt < adminActivityMap[log.admin_id].firstAt) {
      adminActivityMap[log.admin_id].firstAt = createdAt;
    }
    if (createdAt > adminActivityMap[log.admin_id].lastAt) {
      adminActivityMap[log.admin_id].lastAt = createdAt;
    }
    adminActivityMap[log.admin_id].count++;
    if (log.target_entity_type) {
      entityDistribution[log.target_entity_type] =
        (entityDistribution[log.target_entity_type] ?? 0) + 1;
    }
    if (earliestDate === null || createdAt < earliestDate) {
      earliestDate = createdAt;
    }
    if (latestDate === null || createdAt > latestDate) {
      latestDate = createdAt;
    }
  }
  const timeWindow = props.body.timeWindow ?? "day";
  const trends: IEcommerceMallAuditTrailAnalytic.ITrend[] = [];
  if (props.body.includeTrends !== false && logs.length > 0) {
    const dateStartParam = earliestDate ?? "1970-01-01T00:00:00Z";
    const dateEndParam = latestDate ?? "1970-01-01T00:00:00Z";
    const startDate = new Date(dateStartParam);
    const endDate = new Date(dateEndParam);
    const groupedData =
      await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.groupBy({
        by: ["created_at"],
        where: { created_at: { gte: startDate, lte: endDate } },
        _count: { id: true },
        orderBy: { created_at: "asc" },
      });
    for (const item of groupedData) {
      const timeWindowStr = item.created_at.toISOString().split("T")[0];
      const currentStart = new Date(item.created_at);
      const currentEnd = new Date(currentStart.getTime() + 86400000);
      trends.push({
        timeWindow: timeWindowStr,
        actionCount: Number(item._count.id) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        dateStart: currentStart.toISOString(),
        dateEnd: currentEnd.toISOString(),
      });
    }
  }
  const adminActivity: IEcommerceMallAuditTrailAnalytic.IAdminActivity[] =
    Object.entries(adminActivityMap).map(([adminId, data]) => ({
      adminId: adminId as string & tags.Format<"uuid">,
      activityCount: Number(data.count) as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      firstActivityAt: data.firstAt,
      lastActivityAt: data.lastAt,
    }));
  const securityFlags: IEcommerceMallAuditTrailAnalytic.ISecurityFlag[] = [];
  for (const [adminId, data] of Object.entries(adminActivityMap)) {
    if (Number(data.count) > 100) {
      securityFlags.push({
        type: "unusual_activity_spike",
        severity: "medium",
        description: `Admin ${adminId} has unusually high activity (${data.count} actions)`,
        timestamp: new Date().toISOString(),
        details: JSON.stringify({
          admin_id: adminId,
          activity_count: Number(data.count),
          baseline_avg: 50,
          percentage_increase: Math.round(
            ((Number(data.count) - 50) / 50) * 100,
          ),
        }),
      });
    }
  }
  const totalPages = Math.ceil(totalRecords / limit);
  const dataItem: IEcommerceMallAuditTrailAnalytic.ISummary[] = [
    {
      summary: {
        totalLogs: totalRecords,
        uniqueAdmins: Object.keys(adminActivityMap).length,
        uniqueEntities: Object.keys(entityDistribution).length,
        dateRange: {
          minDate: earliestDate ?? "1970-01-01T00:00:00Z",
          maxDate: latestDate ?? "1970-01-01T00:00:00Z",
        },
      },
      actionTypeDistribution: actionTypeDistribution,
      adminActivity,
      targetEntityDistribution: entityDistribution,
      trends,
      securityFlags,
      pagination: {
        current: page,
        limit: limit,
        records: totalRecords,
        pages: totalPages,
      },
    },
  ];
  return {
    data: dataItem,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    },
  };
}
