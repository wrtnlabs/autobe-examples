import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectUtilization";
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

export async function patchHrmPlatformMemberProjectsProjectIdUtilization(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectUtilization.IRequest;
}): Promise<IHrmPlatformProjectUtilization> {
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        budget_hours: true,
      },
    },
  );
  // Verify member has access to this project's organization
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_organization_id: project.organization_id,
      expired_at: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Forbidden", 403);
  }
  // Build date range filter
  const dateFilter: Prisma.hrm_platform_timelogsWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
  };
  const startDate = props.body.start_date
    ? new Date(props.body.start_date)
    : null;
  const endDate = props.body.end_date ? new Date(props.body.end_date) : null;
  if (startDate && endDate) {
    dateFilter.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    dateFilter.date = {
      gte: startDate,
    };
  } else if (endDate) {
    dateFilter.date = {
      lte: endDate,
    };
  }
  // Query all timelogs for aggregation
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: dateFilter,
    select: {
      duration: true,
      billable: true,
    },
  });
  // Calculate aggregations
  const totalDurationMinutes = timelogs.reduce(
    (sum, tl) => sum + tl.duration,
    0,
  );
  const billableDurationMinutes = timelogs
    .filter((tl) => tl.billable)
    .reduce((sum, tl) => sum + tl.duration, 0);
  const nonBillableDurationMinutes = timelogs
    .filter((tl) => !tl.billable)
    .reduce((sum, tl) => sum + tl.duration, 0);
  const actualHours = totalDurationMinutes / 60;
  const billableHours = billableDurationMinutes / 60;
  const nonBillableHours = nonBillableDurationMinutes / 60;
  const totalTimelogCount = timelogs.length;
  // Calculate utilization percentage
  let utilizationPercentage: number | null = null;
  if (project.budget_hours !== null && project.budget_hours > 0) {
    utilizationPercentage = Math.min(
      10000,
      Math.max(0, (actualHours / project.budget_hours) * 100),
    );
  }
  return {
    actual_hours: actualHours,
    budget_hours: project.budget_hours,
    utilization_percentage: utilizationPercentage,
    billable_hours: billableHours,
    non_billable_hours: nonBillableHours,
    total_timelog_count: totalTimelogCount,
  } satisfies IHrmPlatformProjectUtilization;
}
