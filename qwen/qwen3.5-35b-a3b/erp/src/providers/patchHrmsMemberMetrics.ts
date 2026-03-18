import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function patchHrmsMemberMetrics(props: {
  member: MemberPayload;
  body: IHrmsTimelog.IRequest;
}): Promise<IHrmsTimelog> {
  // Get organization context from member
  const memberRecord =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!memberRecord) {
    throw new HttpException("Unauthorized", 401);
  }
  const organizationId = memberRecord.hrms_organization_id;
  // Get current timestamp in Asia/Seoul timezone
  const now: Date = new Date();
  // Calculate current week range (Monday to Sunday)
  const dayOfWeek: number = now.getDay();
  const mondayOffset: number = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset: number = 6 - dayOfWeek;
  const weekStart: Date = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd: Date = new Date(now);
  weekEnd.setDate(now.getDate() + sundayOffset);
  weekEnd.setHours(23, 59, 59, 999);
  // Determine date range for query
  const startDate: Date = props.body.date_range?.start_date
    ? new Date(props.body.date_range.start_date)
    : weekStart;
  const endDate: Date = props.body.date_range?.end_date
    ? new Date(props.body.date_range.end_date)
    : weekEnd;
  // Get active employees in organization
  const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  const activeEmployeeIds: string[] = activeEmployees.map((e) => e.id);
  // 1. Active employees count
  const activeEmployeesCount: number = activeEmployeeIds.length;
  // 2. Current week hours
  const weekHoursResult: {
    _sum: {
      duration_minutes: number | null;
    };
  } = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      employee_id: {
        in: activeEmployeeIds,
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const currentWeekHours: number =
    (weekHoursResult._sum.duration_minutes ?? 0) / 60;
  // 3. Pending timesheets count
  const pendingTimesheetsCount: number =
    await MyGlobal.prisma.hrms_timesheets.count({
      where: {
        hrms_employee_id: {
          in: activeEmployeeIds,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  // 4. High utilization projects (> 80%)
  const projectsWithBudget: Array<{
    id: string;
    name: string;
    description: string | null;
    color_code: string;
    hrms_organization_id: string;
    status: string;
    budget_hours: number | null;
    start_date: Date | null;
    end_date: Date | null;
    created_at: Date;
    updated_at: Date;
  }> = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      status: {
        in: ["active", "archived"],
      },
      budget_hours: {
        not: null,
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      hrms_organization_id: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  const highUtilizationProjects: Array<{
    id: string & tags.Format<"uuid">;
    name: string;
    description: string;
    color_code: string;
    organization_id: string & tags.Format<"uuid">;
    organization_name: string;
    status: "active" | "archived" | "completed";
    budget_hours: number | null;
    start_date: (string & tags.Format<"date-time">) | null;
    end_date: (string & tags.Format<"date-time">) | null;
    planned_hours: number;
    actual_hours: number;
    budget_utilization_percentage: number | null;
    total_tasks: number & tags.Type<"int32">;
    pending_tasks: number & tags.Type<"int32">;
    in_progress_tasks: number & tags.Type<"int32">;
    completed_tasks: number & tags.Type<"int32">;
    closed_tasks: number & tags.Type<"int32">;
    timelog_count: number & tags.Type<"int32">;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = [];
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  const organizationName: string = organization?.name ?? "";
  for (const project of projectsWithBudget) {
    const actualHoursResult: {
      _sum: {
        duration_minutes: number | null;
      };
    } = await MyGlobal.prisma.hrms_timelogs.aggregate({
      where: {
        project_id: project.id,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const timelogCount: number = await MyGlobal.prisma.hrms_timelogs.count({
      where: {
        project_id: project.id,
        deleted_at: null,
      },
    });
    const taskStats: {
      _count: {
        id: number;
      };
    } = await MyGlobal.prisma.hrms_tasks.aggregate({
      where: {
        hrms_project_id: project.id,
      },
      _count: {
        id: true,
      },
    });
    const taskWhereClause: Prisma.hrms_tasksWhereInput = {
      hrms_project_id: project.id,
    };
    const pendingTasks: number = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        ...taskWhereClause,
        status: {
          in: ["open", "pending"],
        },
      },
    });
    const inProgressTasks: number = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        ...taskWhereClause,
        status: "in-progress",
      },
    });
    const completedTasks: number = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        ...taskWhereClause,
        status: "completed",
      },
    });
    const closedTasks: number = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        ...taskWhereClause,
        status: "closed",
      },
    });
    const actualHours: number =
      (actualHoursResult._sum.duration_minutes ?? 0) / 60;
    const budgetHours: number | null = project.budget_hours;
    let budgetUtilizationPercentage: number | null = null;
    if (budgetHours !== null && budgetHours > 0) {
      budgetUtilizationPercentage = (actualHours / budgetHours) * 100;
    }
    if (
      budgetUtilizationPercentage !== null &&
      budgetUtilizationPercentage > 80
    ) {
      const startDateTime: (string & tags.Format<"date-time">) | null =
        isNullDate(project.start_date)
          ? null
          : toISOStringSafe(project.start_date as Date);
      const endDateTime: (string & tags.Format<"date-time">) | null =
        isNullDate(project.end_date)
          ? null
          : toISOStringSafe(project.end_date as Date);
      highUtilizationProjects.push({
        id: project.id as string & tags.Format<"uuid">,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: project.hrms_organization_id as string &
          tags.Format<"uuid">,
        organization_name: organizationName,
        status: project.status as "active" | "archived" | "completed",
        budget_hours: project.budget_hours,
        start_date: startDateTime,
        end_date: endDateTime,
        planned_hours: budgetHours ?? 0,
        actual_hours: actualHours,
        budget_utilization_percentage: budgetUtilizationPercentage,
        total_tasks: taskStats._count.id as number & tags.Type<"int32">,
        pending_tasks: pendingTasks as number & tags.Type<"int32">,
        in_progress_tasks: inProgressTasks as number & tags.Type<"int32">,
        completed_tasks: completedTasks as number & tags.Type<"int32">,
        closed_tasks: closedTasks as number & tags.Type<"int32">,
        timelog_count: timelogCount as number & tags.Type<"int32">,
        created_at: toISOStringSafe(project.created_at),
        updated_at: toISOStringSafe(project.updated_at),
      });
    }
  }
  // Generate week range strings
  const weekStartStr: string & tags.Format<"date"> =
    toISOStringSafe(weekStart).split("T")[0];
  const weekEndStr: string & tags.Format<"date"> =
    toISOStringSafe(weekEnd).split("T")[0];
  // Generate response timestamp
  const generatedAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  return {
    active_employees_count: activeEmployeesCount as number & tags.Type<"int32">,
    current_week_hours: currentWeekHours,
    pending_timesheets_count: pendingTimesheetsCount as number &
      tags.Type<"int32">,
    projects_with_high_utilization: highUtilizationProjects,
    current_week: {
      start_date: weekStartStr,
      end_date: weekEndStr,
    },
    generated_at: generatedAt,
  };
}
function isNullDate(date: Date | null): boolean {
  if (date === null) return true;
  return Number.isNaN(date.getTime());
}
