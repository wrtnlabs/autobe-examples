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

export async function patchHrmsMemberReportsBudget(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  const {
    organization_id,
    start_date,
    end_date,
    page = 1,
    limit = 100,
    sort_order = "desc",
  } = props.body;
  // Validate organization context
  if (!organization_id) {
    throw new HttpException("Organization ID is required", 400);
  }
  // Validate user has access to the organization
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organization_id,
        deleted_at: null,
      },
    });
  if (!organizationMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate organization exists
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: { id: organization_id },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Validate date range
  if (!start_date || !end_date) {
    throw new HttpException("Start date and end date are required", 400);
  }
  const startDate = new Date(`${start_date}T00:00:00Z`);
  const endDate = new Date(`${end_date}T23:59:59Z`);
  if (endDate < startDate) {
    throw new HttpException(
      "End date must be after or equal to start date",
      400,
    );
  }
  // Query projects with budget hours
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organization_id,
      budget_hours: {
        not: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  // Query timelogs within date range
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      project_id: {
        in: projects.map((p) => p.id),
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    select: {
      project_id: true,
      duration_minutes: true,
    },
  });
  // Aggregate timelogs by project
  const timelogAggregations = new Map<string, number>();
  for (const timelog of timelogs) {
    const existing = timelogAggregations.get(timelog.project_id) ?? 0;
    timelogAggregations.set(
      timelog.project_id,
      existing + timelog.duration_minutes,
    );
  }
  // Build report data
  const reportData = projects
    .map((project) => {
      const totalMinutes = timelogAggregations.get(project.id) ?? 0;
      const actualHours = totalMinutes / 60;
      const budgetHours = project.budget_hours ?? 0;
      let utilizationPercentage: number = 0;
      if (budgetHours > 0) {
        utilizationPercentage = Number(
          ((actualHours / budgetHours) * 100).toFixed(1),
        );
      }
      const utilizationFlag = utilizationPercentage > 80;
      return {
        project_id: project.id as string & tags.Format<"uuid">,
        project_name: project.name,
        budget_hours: budgetHours,
        actual_hours: Number(actualHours.toFixed(1)),
        utilization_percentage: utilizationPercentage,
        utilization_flag: utilizationFlag,
      } satisfies IHrmsTimesheet.ISummary;
    })
    .sort((a, b) => {
      return sort_order === "asc"
        ? a.utilization_percentage - b.utilization_percentage
        : b.utilization_percentage - a.utilization_percentage;
    });
  // Calculate pagination
  const total = reportData.length;
  const limitValue = limit ?? 100;
  const pages = limitValue > 0 ? Math.ceil(total / limitValue) : 0;
  const records = Math.min((page - 1) * limitValue + limitValue, total);
  const paginatedData = reportData.slice(
    (page - 1) * limitValue,
    page * limitValue,
  );
  return {
    pagination: {
      current: page,
      limit: limitValue,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIHrmsTimesheet.ISummary;
}
