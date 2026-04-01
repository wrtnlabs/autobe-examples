import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
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

export async function patchHrmPlatformMemberReportsBudget(props: {
  member: MemberPayload;
  body: IHrmPlatformProjectBudgetReport.IRequest;
}): Promise<IPageIHrmPlatformProjectBudgetReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const dateFrom = props.body.date_from;
  const dateTo = props.body.date_to;
  const projectStatus = props.body.project_status;
  const minUtilization = props.body.min_utilization;
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    organization_id: employee.organization_id,
    budget_hours: { not: null },
    deleted_at: null,
    ...(projectStatus && { status: projectStatus }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
      timelogs: {
        where: {
          deleted_at: null,
          ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
          ...(dateTo && { date: { lte: new Date(dateTo) } }),
        },
        select: {
          duration_minutes: true,
        },
      } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
    },
  });
  const reportData = projects
    .map((project) => {
      const actualHours =
        project.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
      const budgetHours = project.budget_hours ?? 0;
      const utilizationPercentage =
        budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
      return {
        id: project.id as string & tags.Format<"uuid">,
        name: project.name,
        color: project.color_code,
        status: project.status as "active" | "archived" | "completed",
        budget_hours: budgetHours,
        actual_hours: actualHours,
        utilization_percentage: utilizationPercentage,
      } satisfies IHrmPlatformProjectBudgetReport.ISummary;
    })
    .filter((report) => {
      if (minUtilization === undefined) return true;
      return report.utilization_percentage >= minUtilization;
    });
  const sortField = props.body.sort;
  if (sortField === "utilization_percentage") {
    reportData.sort(
      (a, b) => a.utilization_percentage - b.utilization_percentage,
    );
  } else if (sortField === "budget_consumption") {
    reportData.sort((a, b) => a.actual_hours - b.actual_hours);
  }
  const total = reportData.length;
  const paginatedData = reportData.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIHrmPlatformProjectBudgetReport.ISummary;
}
