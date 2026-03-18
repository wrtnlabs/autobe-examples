import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
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

export async function patchHrmsMemberTimesheetsAnalytics(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  const {
    organization_id,
    start_date,
    end_date,
    page = 1,
    limit = 20,
    sort_order = "desc",
  } = props.body;
  // Handle null limit - default to 20
  const effectiveLimit = limit ?? 20;
  // Validate date range
  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);
  if (startDateObj > endDateObj) {
    throw new HttpException("end_date must be >= start_date", 400);
  }
  // Get organization member
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organization_id,
        deleted_at: null,
      },
    });
  if (!organizationMember?.id) {
    throw new HttpException("User is not a member of this organization", 403);
  }
  // Query employee linked to this organization member
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (!employee?.id) {
    throw new HttpException(
      "User is not an employee of this organization",
      403,
    );
  }
  const employeeId = employee.id;
  // Query timelogs by employee and date range
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: employeeId,
      date: {
        gte: startDateObj,
        lte: endDateObj,
      },
      deleted_at: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          budget_hours: true,
        },
      },
    },
  });
  // Aggregate by project
  const projectAnalytics = new Map<
    string,
    {
      project_name: string;
      budget_hours: number;
      actual_hours: number;
    }
  >();
  for (const timelog of timelogs) {
    const project = timelog.project;
    const project_id = project.id;
    const existing = projectAnalytics.get(project_id);
    if (existing) {
      existing.actual_hours += timelog.duration_minutes / 60;
    } else {
      projectAnalytics.set(project_id, {
        project_name: project.name,
        budget_hours: project.budget_hours ?? 0,
        actual_hours: timelog.duration_minutes / 60,
      });
    }
  }
  const data: IHrmsTimesheet.ISummary[] = Array.from(
    projectAnalytics.entries(),
  ).map(([project_id, analytics]) => {
    const utilization_percentage =
      analytics.budget_hours > 0
        ? (analytics.actual_hours / analytics.budget_hours) * 100
        : 0;
    return {
      project_id,
      project_name: analytics.project_name,
      budget_hours: analytics.budget_hours,
      actual_hours: Math.round(analytics.actual_hours * 10) / 10,
      utilization_percentage: Math.round(utilization_percentage * 10) / 10,
      utilization_flag:
        analytics.budget_hours > 0 && utilization_percentage > 80,
    };
  });
  const total = await MyGlobal.prisma.hrms_timelogs.count({
    where: {
      employee_id: employeeId,
      date: {
        gte: startDateObj,
        lte: endDateObj,
      },
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: total > 0 ? Math.ceil(total / effectiveLimit) : 0,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsTimesheet.ISummary;
}
