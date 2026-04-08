import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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

export async function getErpHrmAdminProjectsProjectIdTasksAnalytics(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTask> {
  // Verify project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Calculate date threshold for temporal trend (30 days ago)
  // Using string arithmetic for date calculation to avoid Date type
  const nowStr = new globalThis.Date().toISOString();
  const now = globalThis.Date.parse(nowStr);
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoStr = new globalThis.Date(
    now - thirtyDaysMs,
  ).toISOString();
  // Total tasks count
  const totalTasksResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: { erp_hrm_project_id: props.projectId },
    _count: { id: true },
  });
  const totalTasks = totalTasksResult._count.id;
  // Status breakdown using groupBy
  const statusGroups = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { id: true },
  });
  const statusMap = new globalThis.Map<string, number>();
  for (const group of statusGroups) {
    statusMap.set(group.status, group._count.id);
  }
  const statusBreakdown: IErpHrmTask.IStatusBreakdown = {
    open: statusMap.get("open") ?? 0,
    inProgress: statusMap.get("in-progress") ?? 0,
    completed: statusMap.get("completed") ?? 0,
    closed: statusMap.get("closed") ?? 0,
  };
  // Priority breakdown using groupBy
  const priorityGroups = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { id: true },
  });
  const priorityMap = new globalThis.Map<string, number>();
  for (const group of priorityGroups) {
    priorityMap.set(group.priority, group._count.id);
  }
  const priorityBreakdown: IErpHrmTask.IPriorityBreakdown = {
    low: priorityMap.get("low") ?? 0,
    medium: priorityMap.get("medium") ?? 0,
    high: priorityMap.get("high") ?? 0,
    urgent: priorityMap.get("urgent") ?? 0,
  };
  // Average estimated hours
  const avgHoursResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      estimated_hours: { not: null as unknown as undefined },
    },
    _avg: { estimated_hours: true },
  });
  const averageEstimatedHours = avgHoursResult._avg.estimated_hours ?? 0;
  // Overdue tasks: due_date < NOW() AND status NOT IN ('completed', 'closed')
  const overdueResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      due_date: { lt: thirtyDaysAgoStr as unknown as globalThis.Date },
      status: { notIn: ["completed", "closed"] },
    },
    _count: { id: true },
  });
  const overdueTasks = overdueResult._count.id;
  // Completion rate
  const completedTasks = statusBreakdown.completed + statusBreakdown.closed;
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  // Temporal trend: tasks created in last 30 days grouped by date
  const temporalGroups = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["created_at"],
    where: {
      erp_hrm_project_id: props.projectId,
      created_at: { gte: thirtyDaysAgoStr as unknown as globalThis.Date },
    },
    _count: { id: true },
  });
  // Group by date string (YYYY-MM-DD)
  const dateCountMap = new globalThis.Map<string, number>();
  for (const group of temporalGroups) {
    const dateStr = (group.created_at as unknown as string).split("T")[0];
    const existing = dateCountMap.get(dateStr) ?? 0;
    dateCountMap.set(dateStr, existing + group._count.id);
  }
  // Generate all dates in last 30 days and fill missing with 0
  const temporalTrend: IErpHrmTask.ITemporalTrendItem[] = [];
  for (let i = 0; i < 30; i++) {
    const ms = now - i * thirtyDaysMs;
    const dateStr = new globalThis.Date(ms).toISOString().split("T")[0];
    const count = dateCountMap.get(dateStr) ?? 0;
    const trendItem: IErpHrmTask.ITemporalTrendItem = {
      date: dateStr as string & tags.Format<"date">,
      count: count,
    };
    temporalTrend.push(trendItem);
  }
  // Sort by date ascending
  temporalTrend.sort((a, b) => a.date.localeCompare(b.date));
  // Build result
  const result: IErpHrmTask = {
    totalTasks,
    statusBreakdown,
    priorityBreakdown,
    completionRate,
    averageEstimatedHours,
    overdueTasks,
    temporalTrend,
  };
  return result;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminProjectsProjectIdTasksAnalytics(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTask> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------