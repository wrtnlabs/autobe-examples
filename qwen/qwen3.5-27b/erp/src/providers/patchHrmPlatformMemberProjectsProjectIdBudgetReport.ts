import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdBudgetReport(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IBudgetReportRequest;
}): Promise<IHrmPlatformProject.IBudgetReport> {
  // Fetch the project with organization relation
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        color_code: true,
        budget_hours: true,
        created_at: true,
        updated_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    },
  );
  // Build timelog query with optional date filters
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.startDate && {
      date: {
        gte: new Date(props.body.startDate + "T00:00:00.000Z"),
      },
    }),
    ...(props.body.endDate && {
      date: {
        lte: new Date(props.body.endDate + "T23:59:59.999Z"),
      },
    }),
  };
  // Aggregate timelog durations
  const aggregation = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    _sum: {
      duration: true,
    },
    where: timelogWhere,
  });
  // Calculate actual hours (duration is in minutes)
  const actualHours = (aggregation._sum.duration ?? 0) / 60.0;
  // Calculate budget metrics
  const budgetHours = project.budget_hours ?? null;
  const remainingHours =
    budgetHours !== null ? budgetHours - actualHours : null;
  const consumptionPercentage =
    budgetHours !== null ? (actualHours / budgetHours) * 100 : null;
  const isOverBudget = budgetHours !== null ? actualHours > budgetHours : null;
  // Transform organization
  const organization =
    await HrmPlatformOrganizationAtSummaryTransformer.transform(
      project.organization,
    );
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    color_code: project.color_code,
    organization: organization,
    budget_hours: budgetHours,
    actual_hours: actualHours,
    remaining_hours: remainingHours,
    consumption_percentage: consumptionPercentage,
    is_over_budget: isOverBudget,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
  };
}
