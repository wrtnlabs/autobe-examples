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
  // 1. Fetch and validate project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        budget_hours: true,
      },
    },
  );
  // 2. Aggregate total duration from timelogs
  const totalAggregation =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        project_id: props.projectId,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const totalDurationMinutes = totalAggregation._sum.duration_minutes ?? 0;
  // 3. Aggregate billable duration
  const billableAggregation =
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
  const billableDurationMinutes =
    billableAggregation._sum.duration_minutes ?? 0;
  // 4. Aggregate non-billable duration
  const nonBillableAggregation =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        project_id: props.projectId,
        billable: false,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const nonBillableDurationMinutes =
    nonBillableAggregation._sum.duration_minutes ?? 0;
  // 5. Aggregate task counts by status
  const taskStatusCounts = await MyGlobal.prisma.hrm_platform_tasks.groupBy({
    by: ["status"],
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  // Build task counts object with all statuses (default 0)
  const taskCountsMap: {
    TODO: number & tags.Type<"int32">;
    IN_PROGRESS: number & tags.Type<"int32">;
    IN_REVIEW: number & tags.Type<"int32">;
    DONE: number & tags.Type<"int32">;
  } = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  for (const task of taskStatusCounts) {
    switch (task.status) {
      case "TODO":
        taskCountsMap.TODO = task._count.id;
        break;
      case "IN_PROGRESS":
        taskCountsMap.IN_PROGRESS = task._count.id;
        break;
      case "IN_REVIEW":
        taskCountsMap.IN_REVIEW = task._count.id;
        break;
      case "DONE":
        taskCountsMap.DONE = task._count.id;
        break;
    }
  }
  // 6. Calculate budget utilization
  let budgetUtilization: number | null = null;
  if (project.budget_hours !== null) {
    const totalHours = totalDurationMinutes / 60;
    budgetUtilization = (totalHours / project.budget_hours) * 100;
  }
  // 7. Count distinct employees with activity (timelogs OR task assignments)
  const timelogEmployees = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _count: {
      employee_id: true,
    },
  });
  const taskEmployees = await MyGlobal.prisma.hrm_platform_tasks.groupBy({
    by: ["assigned_employee_id"],
    where: {
      project_id: props.projectId,
      deleted_at: null,
      assigned_employee_id: { not: null },
    },
    _count: {
      assigned_employee_id: true,
    },
  });
  // Combine distinct employee IDs from both sources
  const employeeIds = new Set<string>();
  for (const entry of timelogEmployees) {
    employeeIds.add(entry.employee_id);
  }
  for (const entry of taskEmployees) {
    employeeIds.add(entry.assigned_employee_id!);
  }
  const memberActivityCount = employeeIds.size;
  // 8. Return analytics object
  const analytics: IProjectAnalytic = {
    total_duration_minutes: totalDurationMinutes,
    billable_duration_minutes: billableDurationMinutes,
    non_billable_duration_minutes: nonBillableDurationMinutes,
    task_counts: taskCountsMap,
    budget_utilization: budgetUtilization,
    member_activity_count: memberActivityCount,
  };
  return analytics satisfies IProjectAnalytic;
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