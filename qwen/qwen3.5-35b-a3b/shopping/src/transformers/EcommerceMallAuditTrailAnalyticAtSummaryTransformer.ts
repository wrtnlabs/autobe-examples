import { IEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAuditTrailAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAuditTrailAnalyticAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        admin_id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        changes: true,
        previous_values: true,
        new_values: true,
        request_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallAuditTrailAnalytic.ISummary> {
    const totalLogs = input.length;
    const uniqueAdmins = new Set(input.map((r) => r.admin_id)).size;
    const uniqueEntities = new Set(
      input.map((r) => r.target_entity_type).filter((t) => t !== null),
    ).size;
    const minDate = input.reduce(
      (min, r) => (min === null || r.created_at < min ? r.created_at : min),
      input[0]?.created_at || new Date(),
    );
    const maxDate = input.reduce(
      (max, r) => (max === null || r.created_at > max ? r.created_at : max),
      input[0]?.created_at || new Date(),
    );
    const actionTypeDistribution: {
      [key: string]: number;
    } = {};
    input.forEach((r) => {
      actionTypeDistribution[r.action_type] =
        (actionTypeDistribution[r.action_type] || 0) + 1;
    });
    const adminMap = new Map<string, Array<(typeof input)[number]>>();
    input.forEach((r) => {
      if (!adminMap.has(r.admin_id)) adminMap.set(r.admin_id, []);
      adminMap.get(r.admin_id)!.push(r);
    });
    const adminActivity: IEcommerceMallAuditTrailAnalytic.IAdminActivity[] = [];
    for (const [adminId, records] of adminMap) {
      const activityCount = records.length;
      const actionTypeDistribution: {
        [key: string]: number;
      } = {};
      let firstActivityAt = records[0].created_at;
      let lastActivityAt = records[0].created_at;
      records.forEach((r) => {
        actionTypeDistribution[r.action_type] =
          (actionTypeDistribution[r.action_type] || 0) + 1;
        if (r.created_at < firstActivityAt) firstActivityAt = r.created_at;
        if (r.created_at > lastActivityAt) lastActivityAt = r.created_at;
      });
      adminActivity.push({
        adminId,
        activityCount,
        actionTypeDistribution,
        firstActivityAt: toISOStringSafe(firstActivityAt),
        lastActivityAt: toISOStringSafe(lastActivityAt),
      });
    }
    const targetEntityDistribution: {
      [key: string]: number;
    } = {};
    input.forEach((r) => {
      if (r.target_entity_type) {
        targetEntityDistribution[r.target_entity_type] =
          (targetEntityDistribution[r.target_entity_type] || 0) + 1;
      }
    });
    const dateGroups = new Map<string, Array<(typeof input)[number]>>();
    const monthPattern = /\d{4}-\d{2}/;
    input.forEach((r) => {
      const month = toISOStringSafe(r.created_at).slice(0, 7);
      if (!dateGroups.has(month)) dateGroups.set(month, []);
      dateGroups.get(month)!.push(r);
    });
    const trends: IEcommerceMallAuditTrailAnalytic.ITrend[] = [];
    dateGroups.forEach((records, timeWindow) => {
      const actionCount = records.length;
      const dateStart = new Date(timeWindow + "-01T00:00:00.000Z");
      const dateEnd = new Date(timeWindow.slice(0, 7) + "-01T00:00:00.000Z");
      dateEnd.setMonth(dateEnd.getMonth() + 1);
      trends.push({
        timeWindow,
        actionCount,
        dateStart: toISOStringSafe(dateStart),
        dateEnd: toISOStringSafe(dateEnd),
      });
    });
    const securityFlags: IEcommerceMallAuditTrailAnalytic.ISecurityFlag[] = [];
    const adminBanCount = new Map<string, number>();
    input.forEach((r) => {
      if (r.action_type === "user_ban") {
        adminBanCount.set(r.admin_id, (adminBanCount.get(r.admin_id) || 0) + 1);
      }
    });
    adminBanCount.forEach((count, adminId) => {
      if (count > 5) {
        securityFlags.push({
          type: "excessive_bans",
          severity: "high",
          description: `Admin ${adminId} performed ${count} bans in the analysis period`,
          timestamp: toISOStringSafe(new Date()),
          details: JSON.stringify({
            admin_id: adminId,
            ban_count: count,
            threshold: 5,
          }),
        });
      }
    });
    const ipAttempts = new Map<string, number>();
    input.forEach((r) => {
      if (r.ip_address) {
        ipAttempts.set(r.ip_address, (ipAttempts.get(r.ip_address) || 0) + 1);
      }
    });
    ipAttempts.forEach((count, ip) => {
      if (count > 10) {
        securityFlags.push({
          type: "brute_force_attempt",
          severity: "critical",
          description: `High activity from IP ${ip}`,
          timestamp: toISOStringSafe(new Date()),
          details: JSON.stringify({ ip_address: ip, attempt_count: count }),
        });
      }
    });
    const pagination = {
      current: 1,
      limit: totalLogs,
      records: totalLogs,
      pages: 1,
    };
    return {
      summary: {
        totalLogs,
        uniqueAdmins,
        uniqueEntities,
        dateRange: {
          minDate: toISOStringSafe(minDate),
          maxDate: toISOStringSafe(maxDate),
        },
      },
      actionTypeDistribution,
      adminActivity,
      targetEntityDistribution,
      trends,
      securityFlags,
      pagination,
    };
  }
}
