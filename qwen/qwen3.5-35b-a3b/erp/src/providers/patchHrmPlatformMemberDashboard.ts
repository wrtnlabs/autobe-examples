import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
import { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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

export async function patchHrmPlatformMemberDashboard(props: {
  member: MemberPayload;
  body: IHrmPlatformDashboard.IRequest;
}): Promise<IHrmPlatformDashboard.IResponse> {
  const {
    dashboard_type,
    start_date,
    end_date,
    task_status_filter,
    page,
    limit,
  } = props.body;
  if (dashboard_type !== "personal" && dashboard_type !== "organization") {
    throw new HttpException("Invalid dashboard_type", 400);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
    },
    select: {
      organization_id: true,
    },
  });
  if (session === null || session.organization_id === null) {
    throw new HttpException("Organization context required", 400);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const response: IHrmPlatformDashboard.IResponse = {
    dashboard_type,
    personal_metrics: null,
    org_metrics: null,
  };
  if (dashboard_type === "personal") {
    const personalMetrics = await calculatePersonalMetrics({
      employeeId: employee.id,
      start_date,
      end_date,
      task_status_filter,
      page,
      limit,
    });
    response.personal_metrics = personalMetrics;
  } else if (dashboard_type === "organization") {
    const hasReportView =
      await MyGlobal.prisma.hrm_platform_permissions.findFirst({
        where: {
          organization_id: session.organization_id,
          code: "report_view",
        },
        select: {
          id: true,
        },
      });
    if (hasReportView === null) {
      throw new HttpException("Forbidden", 403);
    }
    const orgMetrics = await calculateOrganizationMetrics({
      organizationId: session.organization_id,
    });
    response.org_metrics = orgMetrics;
  }
  return response;
}
async function calculatePersonalMetrics(props: {
  employeeId: string & tags.Format<"uuid">;
  start_date?: string | undefined;
  end_date?: string | undefined;
  task_status_filter?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}): Promise<IHrmPlatformDashboardIPersonalMetric> {
  const todayStr = new Date().toISOString().split("T")[0];
  const startOfDay = todayStr + "T00:00:00.000Z";
  const endOfDay = todayStr + "T23:59:59.999Z";
  const hoursResult = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      employee_id: props.employeeId,
      start_datetime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const hours_logged_today: number & tags.Type<"int32"> =
    hoursResult._sum.duration_minutes ?? 0;
  const activeTimerRecord = await MyGlobal.prisma.hrm_platform_timers.findFirst(
    {
      where: {
        hrm_platform_employee_id: props.employeeId,
        status: {
          in: ["started", "paused"],
        },
        deleted_at: null,
      },
      orderBy: { last_tick_at: "desc" },
      select: {
        id: true,
        status: true,
        last_tick_at: true,
        duration_seconds: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            color_code: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            description: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    },
  );
  const active_timer: IHrmPlatformTimer.ISummary | null = activeTimerRecord
    ? {
        id: activeTimerRecord.id,
        status: activeTimerRecord.status,
        lastTickAt: toISOStringSafe(activeTimerRecord.last_tick_at),
        durationSeconds: activeTimerRecord.duration_seconds,
        createdAt: toISOStringSafe(activeTimerRecord.created_at),
        updatedAt: toISOStringSafe(activeTimerRecord.updated_at),
        deletedAt:
          activeTimerRecord.deleted_at !== null
            ? toISOStringSafe(activeTimerRecord.deleted_at)
            : null,
        task: null,
        project: activeTimerRecord.project
          ? toProjectSummary(activeTimerRecord.project)
          : {
              id: "",
              name: "Unknown",
              status: "archived",
              color_code: "#999999",
              budget_hours: null,
              start_date: null,
              end_date: null,
              description: null,
              total_hours: 0,
              billable_hours: 0,
              non_billable_hours: 0,
              timelog_count: 0,
              employee_count: 0,
              budget_utilization: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
      }
    : null;
  const recentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: props.employeeId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    take: 5,
    select: {
      id: true,
      start_datetime: true,
      end_datetime: true,
      duration_minutes: true,
      billable: true,
      description: true,
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          color_code: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const recent_timelogs: IHrmPlatformTimelog.ISummary[] & tags.MaxItems<5> =
    recentTimelogs.map((t) => ({
      id: t.id,
      start_datetime: toISOStringSafe(t.start_datetime),
      end_datetime: toISOStringSafe(t.end_datetime),
      duration_minutes: t.duration_minutes,
      billable: t.billable,
      description: t.description,
      employee: {
        id: props.employeeId,
        employee_code: "",
        display_name: "",
        email: "",
        phone_number: undefined,
        job_title: undefined,
        job_level: "",
        employment_type: "",
        status: "",
        start_date: "",
        end_date: undefined,
        is_pending: false,
        created_at: "",
        updated_at: "",
        deleted_at: null,
        member: {
          id: "",
          email: "",
          display_name: undefined,
          avatar_uri: undefined,
          phone_number: undefined,
          is_active: false,
          last_login_at: undefined,
          created_at: "",
          updated_at: "",
          deleted_at: undefined,
        },
        role: {
          id: "",
          name: "",
          role_kind: "",
          organization: {
            id: "",
            name: "",
            description: undefined,
            currency: undefined,
            timezone: undefined,
            fiscal_start_month: undefined,
            created_at: "",
            updated_at: "",
            deleted_at: null,
            owner: {
              id: "",
              email: "",
              display_name: undefined,
              avatar_uri: undefined,
              phone_number: undefined,
              is_active: false,
              last_login_at: undefined,
              created_at: "",
              updated_at: "",
              deleted_at: undefined,
            },
          },
          permissions_count: 0,
        },
        department: null,
        organization: {
          id: "",
          name: "",
          description: undefined,
          currency: undefined,
          timezone: undefined,
          fiscal_start_month: undefined,
          created_at: "",
          updated_at: "",
          deleted_at: null,
          owner: {
            id: "",
            email: "",
            display_name: undefined,
            avatar_uri: undefined,
            phone_number: undefined,
            is_active: false,
            last_login_at: undefined,
            created_at: "",
            updated_at: "",
            deleted_at: undefined,
          },
        },
      },
      project: t.project
        ? toProjectSummary(t.project)
        : {
            id: "",
            name: "Unknown",
            status: "archived",
            color_code: "#999999",
            budget_hours: null,
            start_date: null,
            end_date: null,
            description: null,
            total_hours: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            timelog_count: 0,
            employee_count: 0,
            budget_utilization: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
      task: null,
    }));
  const now = new Date();
  const currentWeekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
  );
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      hrm_platform_employee_id: props.employeeId,
      start_date: {
        lte: toISOStringSafe(currentWeekEnd),
      },
      end_date: {
        gte: toISOStringSafe(currentWeekStart),
      },
      deleted_at: null,
    },
    select: {
      status: true,
      rejected_at: true,
    },
  });
  const pending_timesheet_status: {
    status: "pending" | "submitted" | "approved" | "rejected" | "cancelled";
    rejection_reason: string | null;
  } = timesheet
    ? {
        status: timesheet.status as
          | "pending"
          | "submitted"
          | "approved"
          | "rejected"
          | "cancelled",
        rejection_reason:
          timesheet.rejected_at !== null ? "Timesheet rejected" : null,
      }
    : {
        status: "pending",
        rejection_reason: null,
      };
  const taskStatuses: string[] = props.task_status_filter
    ? [props.task_status_filter]
    : ["IN_PROGRESS", "TODO"];
  const pageNum: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.page ?? 1;
  const limitNum: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.limit ?? 10;
  const skip = (pageNum - 1) * limitNum;
  const assignedTasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: {
      assigned_employee_id: props.employeeId,
      status: {
        in: taskStatuses,
      },
      deleted_at: null,
    },
    orderBy: { due_date: "asc" },
    skip,
    take: limitNum,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      created_at: true,
      due_date: true,
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          color_code: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          created_at: true,
          due_date: true,
        },
      },
    },
  });
  const assigned_tasks: IHrmPlatformTask.ISummary[] = assignedTasks.map(
    (t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      created_at: toISOStringSafe(t.created_at),
      due_date: t.due_date !== null ? toISOStringSafe(t.due_date) : null,
      project: t.project
        ? toProjectSummary(t.project)
        : {
            id: "",
            name: "Unknown",
            status: "archived",
            color_code: "#999999",
            budget_hours: null,
            start_date: null,
            end_date: null,
            description: null,
            total_hours: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            timelog_count: 0,
            employee_count: 0,
            budget_utilization: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
      parentTask: t.parentTask
        ? {
            id: t.parentTask.id,
            title: t.parentTask.title,
            status: t.parentTask.status,
            priority: t.parentTask.priority,
            created_at: toISOStringSafe(t.parentTask.created_at),
            due_date:
              t.parentTask.due_date !== null
                ? toISOStringSafe(t.parentTask.due_date)
                : null,
            project: {
              id: "",
              name: "Unknown",
              status: "archived",
              color_code: "#999999",
              budget_hours: null,
              start_date: null,
              end_date: null,
              description: null,
              total_hours: 0,
              billable_hours: 0,
              non_billable_hours: 0,
              timelog_count: 0,
              employee_count: 0,
              budget_utilization: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            assignedEmployee: null,
            parentTask: null,
          }
        : null,
    }),
  );
  return {
    hours_logged_today,
    active_timer,
    recent_timelogs,
    pending_timesheet_status,
    assigned_tasks,
  };
}
async function calculateOrganizationMetrics(props: {
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDashboardIOrgMetric> {
  const total_active_employees: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: props.organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  const employeeIds = await MyGlobal.prisma.hrm_platform_employees
    .findMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    })
    .then((employees) => employees.map((e) => e.id));
  const pending_timesheets_count: number & tags.Type<"int32"> =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  return {
    total_active_employees,
    pending_timesheets_count,
  };
}
function toProjectSummary(project: {
  id: string;
  name: string;
  status: string;
  color_code: string;
  budget_hours: number | null;
  start_date: Date | null;
  end_date: Date | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}): IHrmPlatformProject.ISummary {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    color_code: project.color_code,
    budget_hours: project.budget_hours,
    start_date:
      project.start_date !== null ? toISOStringSafe(project.start_date) : null,
    end_date:
      project.end_date !== null ? toISOStringSafe(project.end_date) : null,
    description: project.description,
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
    timelog_count: 0,
    employee_count: 0,
    budget_utilization: null,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
  } satisfies IHrmPlatformProject.ISummary;
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
// import { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
// import { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberDashboard(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDashboard.IRequest;
// }): Promise<IHrmPlatformDashboard.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------