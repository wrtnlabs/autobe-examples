import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdTasksAnalytics(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTask> {
  // 1. Verify project exists and get organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // 2. Authorize member via employee record in same organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Total task count
  const totalTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: { erp_hrm_project_id: props.projectId },
  });
  // 4. Status breakdown using groupBy
  const statusGroups = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { status: true },
  });
  const statusBreakdown: IErpHrmTask.IStatusBreakdown = {
    open: statusGroups.find((g) => g.status === "open")?._count.status ?? 0,
    inProgress:
      statusGroups.find((g) => g.status === "in-progress")?._count.status ?? 0,
    completed:
      statusGroups.find((g) => g.status === "completed")?._count.status ?? 0,
    closed: statusGroups.find((g) => g.status === "closed")?._count.status ?? 0,
  };
  // 5. Priority breakdown using groupBy
  const priorityGroups = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { priority: true },
  });
  const priorityBreakdown: IErpHrmTask.IPriorityBreakdown = {
    low: priorityGroups.find((g) => g.priority === "low")?._count.priority ?? 0,
    medium:
      priorityGroups.find((g) => g.priority === "medium")?._count.priority ?? 0,
    high:
      priorityGroups.find((g) => g.priority === "high")?._count.priority ?? 0,
    urgent:
      priorityGroups.find((g) => g.priority === "urgent")?._count.priority ?? 0,
  };
  // 6. Completion rate
  const completedTasks = statusBreakdown.completed + statusBreakdown.closed;
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  // 7. Average estimated hours using aggregate
  const estimatedAvgResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      estimated_hours: { not: null },
    },
    _avg: { estimated_hours: true },
  });
  const averageEstimatedHours = estimatedAvgResult._avg.estimated_hours ?? 0;
  // 8. Overdue tasks count
  const overdueTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: {
      erp_hrm_project_id: props.projectId,
      due_date: { lt: new Date() },
      status: { notIn: ["completed", "closed"] },
    },
  });
  // 9. Temporal trend: last 30 days using string manipulation (no Date type)
  const nowString: string = new Date().toISOString();
  const currentYear = parseInt(nowString.substring(0, 4), 10);
  const currentMonth = parseInt(nowString.substring(5, 7), 10) - 1;
  const currentDay = parseInt(nowString.substring(8, 10), 10);
  // Calculate 30 days ago in YYYY-MM-DD string format
  let targetMonth = currentMonth - 30;
  let targetYear = currentYear;
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  let targetDay = currentDay;
  if (targetDay > daysInTargetMonth) {
    targetDay = daysInTargetMonth;
  }
  const targetMonthPadded = String(targetMonth + 1).padStart(2, "0");
  const targetDayPadded = String(targetDay).padStart(2, "0");
  const thirtyDaysAgoString = `${targetYear}-${targetMonthPadded}-${targetDayPadded}`;
  // Convert to ISO string for Prisma query (Prisma requires Date for datetime comparison)
  const thirtyDaysAgoIso = `${thirtyDaysAgoString}T00:00:00.000Z`;
  const recentTasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      erp_hrm_project_id: props.projectId,
      created_at: { gte: new Date(thirtyDaysAgoIso) },
    },
    select: { created_at: true },
  });
  // Group by date string
  const groupedByDate = new Map<string, number>();
  for (const task of recentTasks) {
    const dayString: string = task.created_at.toISOString().substring(0, 10);
    groupedByDate.set(dayString, (groupedByDate.get(dayString) ?? 0) + 1);
  }
  const temporalTrend: IErpHrmTask.ITemporalTrendItem[] = [];
  for (const [dayString, count] of groupedByDate) {
    temporalTrend.push({
      date: dayString as string & tags.Format<"date">,
      count: count,
    });
  }
  temporalTrend.sort((a, b) => a.date.localeCompare(b.date));
  // 10. Return response using satisfies for type safety (no as assertions)
  return {
    totalTasks,
    statusBreakdown,
    priorityBreakdown,
    completionRate,
    averageEstimatedHours,
    overdueTasks,
    temporalTrend,
  } satisfies IErpHrmTask;
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
// export async function getErpHrmMemberProjectsProjectIdTasksAnalytics(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTask> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------