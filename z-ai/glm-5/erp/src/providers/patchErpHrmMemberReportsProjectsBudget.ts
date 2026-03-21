import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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

export async function patchErpHrmMemberReportsProjectsBudget(props: {
  member: MemberPayload;
  body: IErpHrmProject.IBudgetRequest;
}): Promise<IPageIErpHrmProject.IBudgetSummary> {
  // Authorization: Get session and check organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { erp_hrm_role_id: true },
  });
  // Check for report:view permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "report:view",
    },
  });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for projects
  const whereInput = {
    organization_id: session.erp_hrm_organization_id,
    budget_hours: { not: null },
    deleted_at: null,
    ...(props.body.status !== null &&
      props.body.status !== undefined && { status: props.body.status }),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  // Get all projects with budget_hours defined
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
    },
  });
  // Aggregate timelogs for all projects
  const projectIds = projects.map((p) => p.id);
  const timelogAggregations =
    projectIds.length > 0
      ? await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
          by: ["project_id"],
          where: {
            project_id: { in: projectIds },
            deleted_at: null,
          },
          _sum: {
            duration: true,
          },
        })
      : [];
  // Create lookup map for durations (in seconds)
  const durationMap = new Map(
    timelogAggregations.map((a) => [a.project_id, a._sum.duration ?? 0]),
  );
  // Compute utilization for each project
  const summaries: IErpHrmProject.IBudgetSummary[] = projects.map((project) => {
    const budgetHours = project.budget_hours!;
    const actualSeconds = durationMap.get(project.id) ?? 0;
    const actualHours = actualSeconds / 3600;
    const utilizationPercentage =
      budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
    return {
      id: project.id,
      name: project.name,
      color_code: project.color_code,
      status: project.status,
      budget_hours: budgetHours,
      actual_hours: Math.round(actualHours * 100) / 100,
      utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
    } satisfies IErpHrmProject.IBudgetSummary;
  });
  // Sort by utilization_percentage descending (highest first)
  summaries.sort((a, b) => b.utilization_percentage - a.utilization_percentage);
  // Apply pagination
  const total = summaries.length;
  const pages = Math.ceil(total / limit);
  const paginatedData = summaries.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIErpHrmProject.IBudgetSummary;
}
