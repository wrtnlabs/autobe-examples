import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IProjectAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IProjectAnalytic";
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

export async function getHrmPlatformMemberProjectsProjectIdAnalytics(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IProjectAnalytic> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        budget_hours: true,
      },
    },
  );
  const totalTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const totalDurationMinutes = totalTimelogs._sum.duration_minutes ?? 0;
  const billableTimelogs =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        project_id: props.projectId,
        billable: true,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const billableDurationMinutes = billableTimelogs._sum.duration_minutes ?? 0;
  const nonBillableDurationMinutes =
    totalDurationMinutes - billableDurationMinutes;
  const taskStats = await MyGlobal.prisma.hrm_platform_tasks.groupBy({
    by: ["status"],
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  const taskCounts = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  for (const stat of taskStats) {
    switch (stat.status) {
      case "TODO":
        taskCounts.TODO = stat._count.id;
        break;
      case "IN_PROGRESS":
        taskCounts.IN_PROGRESS = stat._count.id;
        break;
      case "IN_REVIEW":
        taskCounts.IN_REVIEW = stat._count.id;
        break;
      case "DONE":
        taskCounts.DONE = stat._count.id;
        break;
    }
  }
  const timelogEmployees = await MyGlobal.prisma.hrm_platform_timelogs.findMany(
    {
      where: {
        project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        employee_id: true,
      },
    },
  );
  const taskHistories =
    await MyGlobal.prisma.hrm_platform_task_histories.findMany({
      where: {
        task: {
          project_id: props.projectId,
          deleted_at: null,
        },
      },
      select: {
        actor_id: true,
      },
    });
  const employeeIds = new Set<string>();
  for (const log of timelogEmployees) {
    employeeIds.add(log.employee_id);
  }
  for (const history of taskHistories) {
    employeeIds.add(history.actor_id);
  }
  const memberActivityCount = employeeIds.size;
  let budgetUtilization: number | null = null;
  if (project.budget_hours !== null && project.budget_hours !== undefined) {
    const totalHoursLogged = totalDurationMinutes / 60;
    budgetUtilization = (totalHoursLogged / project.budget_hours) * 100;
  }
  return {
    total_duration_minutes: totalDurationMinutes,
    billable_duration_minutes: billableDurationMinutes,
    non_billable_duration_minutes: nonBillableDurationMinutes,
    task_counts: taskCounts,
    budget_utilization: budgetUtilization,
    member_activity_count: memberActivityCount,
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
// import { IProjectAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IProjectAnalytic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdAnalytics(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IProjectAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------