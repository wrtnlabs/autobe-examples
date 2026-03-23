import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeStatistic";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminEmployeesStatistics(props: {
  admin: AdminPayload;
}): Promise<IHrmPlatformEmployeeStatistic> {
  const adminSession =
    await MyGlobal.prisma.hrm_platform_admin_sessions.findUnique({
      where: { id: props.admin.session_id },
      select: { href: true },
    });
  if (!adminSession) {
    throw new HttpException("Session not found", 404);
  }
  const hrefParts = adminSession.href.split("/");
  const orgIndex = hrefParts.indexOf("organizations");
  const organizationId =
    orgIndex >= 0 && hrefParts[orgIndex + 1]
      ? hrefParts[orgIndex + 1]
      : hrefParts[hrefParts.length - 1];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekMonday = new Date(today);
  weekMonday.setDate(today.getDate() - daysSinceMonday);
  weekMonday.setHours(0, 0, 0, 0);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);
  const totalEmployees = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
  });
  const activeEmployees = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  const deactivatedEmployees =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        organization_id: organizationId,
        status: "deactivated",
        deleted_at: null,
      },
    });
  const employmentTypeBreakdown =
    await MyGlobal.prisma.hrm_platform_employees.groupBy({
      by: ["employment_type"],
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      _count: true,
    });
  const byEmploymentType = {
    full_time: 0,
    part_time: 0,
    contractor: 0,
    intern: 0,
  };
  for (const record of employmentTypeBreakdown) {
    if (record.employment_type === "full-time") {
      byEmploymentType.full_time = record._count;
    } else if (record.employment_type === "part-time") {
      byEmploymentType.part_time = record._count;
    } else if (record.employment_type === "contractor") {
      byEmploymentType.contractor = record._count;
    } else if (record.employment_type === "intern") {
      byEmploymentType.intern = record._count;
    }
  }
  const totalHoursResult =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        employee: {
          organization_id: organizationId,
          deleted_at: null,
        },
        date: {
          gte: weekMonday,
          lte: weekSunday,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const totalHoursThisWeek = totalHoursResult._sum.duration
    ? totalHoursResult._sum.duration / 60
    : 0;
  const averageHoursResult =
    await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_employee_id"],
      where: {
        employee: {
          organization_id: organizationId,
          status: "active",
          deleted_at: null,
        },
        date: {
          gte: weekMonday,
          lte: weekSunday,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
  const employeeHours = averageHoursResult.map((r) =>
    r._sum.duration ? r._sum.duration / 60 : 0,
  );
  const averageHoursPerEmployee =
    employeeHours.length > 0
      ? employeeHours.reduce((a, b) => a + b, 0) / employeeHours.length
      : 0;
  const topEmployeeIds = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_employee_id"],
    where: {
      employee: {
        organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
      date: {
        gte: weekMonday,
        lte: weekSunday,
      },
      deleted_at: null,
    },
    _sum: {
      duration: true,
    },
    orderBy: {
      _sum: {
        duration: "desc",
      },
    },
    take: 5,
  });
  const topEmployees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      id: {
        in: topEmployeeIds.map((e) => e.hrm_platform_employee_id),
      },
      status: "active",
      deleted_at: null,
    },
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  const topPerformers = await ArrayUtil.asyncMap(
    topEmployees,
    HrmPlatformEmployeeAtSummaryTransformer.transform,
  );
  const pendingTimesheets = await MyGlobal.prisma.hrm_platform_timesheets.count(
    {
      where: {
        employee: {
          organization_id: organizationId,
        },
        status: "submitted",
        deleted_at: null,
      },
    },
  );
  const approvedTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        employee: {
          organization_id: organizationId,
        },
        status: "approved",
        week_start_date: {
          gte: weekMonday,
          lte: weekSunday,
        },
        deleted_at: null,
      },
    });
  const rejectedTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        employee: {
          organization_id: organizationId,
        },
        status: "rejected",
        week_start_date: {
          gte: weekMonday,
          lte: weekSunday,
        },
        deleted_at: null,
      },
    });
  const projectsWithBudget =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        organization_id: organizationId,
        budget_hours: {
          not: null,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        budget_hours: true,
      },
    });
  const budgetWarnings: IHrmPlatformProject.ISummary[] = [];
  for (const project of projectsWithBudget) {
    if (!project.budget_hours || project.budget_hours === 0) continue;
    const hoursResult = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        hrm_platform_project_id: project.id,
        date: {
          gte: weekMonday,
          lte: weekSunday,
        },
        deleted_at: null,
      },
      _sum: {
        duration: true,
      },
    });
    const hoursLogged = hoursResult._sum.duration
      ? hoursResult._sum.duration / 60
      : 0;
    const utilization = (hoursLogged / project.budget_hours) * 100;
    if (utilization > 80) {
      const projectDetail =
        await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
          where: { id: project.id },
          ...HrmPlatformProjectAtSummaryTransformer.select(),
        });
      const transformed =
        await HrmPlatformProjectAtSummaryTransformer.transform(projectDetail);
      budgetWarnings.push(transformed);
    }
  }
  return {
    total_employees: totalEmployees,
    active_employees: activeEmployees,
    deactivated_employees: deactivatedEmployees,
    by_employment_type: byEmploymentType,
    total_hours_this_week: totalHoursThisWeek,
    average_hours_per_employee: averageHoursPerEmployee,
    top_performers: topPerformers,
    pending_timesheets: pendingTimesheets,
    approved_timesheets: approvedTimesheets,
    rejected_timesheets: rejectedTimesheets,
    budget_warnings: budgetWarnings,
    generated_at: new Date().toISOString(),
  };
}
