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

export async function getErpHrmAdminProjectsProjectIdTasksTaskId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTask> {
  // Verify project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Total tasks count
  const totalResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: { erp_hrm_project_id: props.projectId },
    _count: { _all: true },
  });
  const totalTasks: number = totalResult._count._all;
  // Status breakdown aggregation
  const statusCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { status: true },
  });
  const statusBreakdown: IErpHrmTask.IStatusBreakdown = {
    open: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
  };
  for (const item of statusCounts) {
    if (item.status === "open") statusBreakdown.open = item._count.status;
    else if (item.status === "in-progress")
      statusBreakdown.inProgress = item._count.status;
    else if (item.status === "completed")
      statusBreakdown.completed = item._count.status;
    else if (item.status === "closed")
      statusBreakdown.closed = item._count.status;
  }
  // Priority breakdown aggregation
  const priorityCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { priority: true },
  });
  const priorityBreakdown: IErpHrmTask.IPriorityBreakdown = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  for (const item of priorityCounts) {
    if (item.priority === "low") priorityBreakdown.low = item._count.priority;
    else if (item.priority === "medium")
      priorityBreakdown.medium = item._count.priority;
    else if (item.priority === "high")
      priorityBreakdown.high = item._count.priority;
    else if (item.priority === "urgent")
      priorityBreakdown.urgent = item._count.priority;
  }
  // Calculate completion rate
  const completedOrClosed: number =
    statusBreakdown.completed + statusBreakdown.closed;
  const completionRate: number =
    totalTasks > 0
      ? Math.round((completedOrClosed / totalTasks) * 10000) / 100
      : 0;
  // Average estimated hours
  const avgResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      estimated_hours: { not: null },
    },
    _avg: { estimated_hours: true },
  });
  const averageEstimatedHours: number = avgResult._avg.estimated_hours ?? 0;
  // Overdue tasks count (past due date, not completed or closed)
  const nowIso: string = new Date().toISOString();
  const overdueResult = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: {
      erp_hrm_project_id: props.projectId,
      due_date: { lt: nowIso },
      status: { notIn: ["completed", "closed"] },
    },
  });
  const overdueTasks: number = overdueResult;
  // Temporal trend - last 30 days using raw query
  const thirtyDaysAgoIso: string = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const temporalData = await MyGlobal.prisma.$queryRaw<
    Array<{
      date: string;
      count: bigint;
    }>
  >`
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
    FROM "erp_hrm_tasks"
    WHERE erp_hrm_project_id = ${props.projectId}
      AND created_at >= ${thirtyDaysAgoIso}::timestamp
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date
  `;
  const temporalTrend: IErpHrmTask.ITemporalTrendItem[] = temporalData.map(
    (item) => ({
      date: item.date as string & tags.Format<"date">,
      count: Number(item.count) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    }),
  );
  return {
    totalTasks: totalTasks as number & tags.Type<"int32"> & tags.Minimum<0>,
    statusBreakdown,
    priorityBreakdown,
    completionRate: completionRate as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    averageEstimatedHours: averageEstimatedHours as number & tags.Minimum<0>,
    overdueTasks: overdueTasks as number & tags.Type<"int32"> & tags.Minimum<0>,
    temporalTrend,
  };
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
// export async function getErpHrmAdminProjectsProjectIdTasksTaskId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTask> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------