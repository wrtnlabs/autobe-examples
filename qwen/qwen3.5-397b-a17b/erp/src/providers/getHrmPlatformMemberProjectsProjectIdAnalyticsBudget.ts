import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
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

export async function getHrmPlatformMemberProjectsProjectIdAnalyticsBudget(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectBudgetAnalytic> {
  // Get member's employee record to find organization context
  const employeeRecord =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  // Verify project exists in member's organization and get budget_hours
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      organization_id: employeeRecord.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      budget_hours: true,
    },
  });
  // Aggregate timelogs for this project (exclude soft-deleted)
  const timelogAggregation =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: {
        project_id: props.projectId,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  // Calculate actual hours (convert minutes to hours)
  const actualHours = (timelogAggregation._sum.duration_minutes ?? 0) / 60;
  // Calculate budget analytics
  const budgetHours = project.budget_hours;
  const consumptionPercentage =
    budgetHours !== null ? (actualHours / budgetHours) * 100 : null;
  const remainingHours =
    budgetHours !== null ? budgetHours - actualHours : null;
  // Return analytics
  return {
    projectId: props.projectId,
    budgetHours,
    actualHours,
    consumptionPercentage,
    remainingHours,
  };
}
