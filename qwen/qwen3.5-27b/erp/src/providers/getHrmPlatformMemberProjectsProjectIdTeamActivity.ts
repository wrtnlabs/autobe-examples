import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMostActiveMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMostActiveMember";
import { IHrmPlatformProjectTeamActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTeamActivity";
import { IHrmPlatformProjectTeamActivityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTeamActivityMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdTeamActivity(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectTeamActivity> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      ...HrmPlatformProjectAtSummaryTransformer.select(),
    },
  );
  const projectSummary =
    await HrmPlatformProjectAtSummaryTransformer.transform(project);
  // Get all active project memberships with employee details
  const memberships =
    await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
      where: {
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        role: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      },
    });
  // Get recent date threshold (7 days ago)
  const recentThreshold = new Date();
  recentThreshold.setDate(recentThreshold.getDate() - 7);
  // Aggregate timelogs for each team member
  const teamMembers: IHrmPlatformProjectTeamActivityMember[] =
    await ArrayUtil.asyncMap(memberships, async (membership) => {
      const employeeId = membership.hrm_platform_employee_id;
      const employeeSummary =
        await HrmPlatformEmployeeAtSummaryTransformer.transform(
          membership.employee,
        );
      // Get timelog aggregations for this employee on this project
      const aggregations =
        await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
          where: {
            hrm_platform_employee_id: employeeId,
            hrm_platform_project_id: props.projectId,
            deleted_at: null,
          },
          _sum: {
            duration: true,
          },
          _count: {
            id: true,
          },
          _max: {
            date: true,
          },
        });
      const totalMinutes = aggregations._sum.duration ?? 0;
      const totalHoursLogged = totalMinutes / 60;
      const totalTimelogs = aggregations._count.id;
      const lastActivityDate = aggregations._max.date;
      // Calculate average daily hours
      let averageDailyHours = 0;
      if (totalTimelogs > 0) {
        const distinctDates =
          await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
            by: ["date"],
            where: {
              hrm_platform_employee_id: employeeId,
              hrm_platform_project_id: props.projectId,
              deleted_at: null,
            },
            _count: {
              id: true,
            },
          });
        const uniqueDays = distinctDates.length;
        if (uniqueDays > 0) {
          averageDailyHours = totalHoursLogged / uniqueDays;
        }
      }
      // Convert lastActivityDate to date string format (YYYY-MM-DD)
      const lastActivityDateStr = lastActivityDate
        ? (lastActivityDate.toISOString().split("T")[0] as string &
            tags.Format<"date">)
        : null;
      return {
        employee: employeeSummary,
        totalHoursLogged,
        totalTimelogs: totalTimelogs as number & tags.Type<"int32">,
        averageDailyHours,
        lastActivityDate: lastActivityDateStr,
      } satisfies IHrmPlatformProjectTeamActivityMember;
    });
  // Calculate overall statistics
  const totalHoursLogged = teamMembers.reduce(
    (sum, m) => sum + m.totalHoursLogged,
    0,
  );
  const totalTimelogs = teamMembers.reduce(
    (sum, m) => sum + m.totalTimelogs,
    0,
  ) as number & tags.Type<"int32">;
  const activeTeamMembersCount = memberships.length as number &
    tags.Type<"int32">;
  const averageHoursPerMember =
    activeTeamMembersCount > 0 ? totalHoursLogged / activeTeamMembersCount : 0;
  // Count recent activity (last 7 days)
  const recentActivityCountResult =
    await MyGlobal.prisma.hrm_platform_timelogs.count({
      where: {
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
        date: {
          gte: recentThreshold,
        },
      },
    });
  // Find most active member
  let mostActiveMember: IHrmPlatformProjectMostActiveMember | null = null;
  if (teamMembers.length > 0) {
    const sortedMembers = [...teamMembers].sort(
      (a, b) => b.totalHoursLogged - a.totalHoursLogged,
    );
    const topMember = sortedMembers[0];
    if (topMember.totalHoursLogged > 0) {
      mostActiveMember = {
        employee: topMember.employee,
        totalHoursLogged: topMember.totalHoursLogged,
        totalTimelogs: topMember.totalTimelogs,
      } satisfies IHrmPlatformProjectMostActiveMember;
    }
  }
  return {
    project: projectSummary,
    overall: {
      totalHoursLogged,
      totalTimelogs,
      activeTeamMembersCount,
      averageHoursPerMember,
      recentActivityCount: recentActivityCountResult as number &
        tags.Type<"int32">,
    },
    teamMembers,
    mostActiveMember,
  } satisfies IHrmPlatformProjectTeamActivity;
}
