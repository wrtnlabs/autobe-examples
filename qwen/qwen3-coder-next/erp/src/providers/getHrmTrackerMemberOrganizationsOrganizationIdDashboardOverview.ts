import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import { IHrmTrackerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDashboard";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
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

export async function getHrmTrackerMemberOrganizationsOrganizationIdDashboardOverview(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<IHrmTrackerDashboard.IOverview> {
  // Verify organization exists and user belongs
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findFirst({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify user has employee record in this organization
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Count active employees
  const employeeCount = await MyGlobal.prisma.hrm_tracker_employees.count({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  // Aggregate project statistics
  const projects = await MyGlobal.prisma.hrm_tracker_projects.findMany({
    where: {
      organization: {
        id: props.organizationId,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };
  // Calculate timesheet summary
  const timesheets = await MyGlobal.prisma.hrm_tracker_timesheets.findMany({
    where: {
      organization: {
        id: props.organizationId,
        deleted_at: null,
      },
    },
    select: {
      status: true,
    },
  });
  const timesheetSummary = {
    submitted: timesheets.filter((t) => t.status === "submitted").length,
    pending: timesheets.filter((t) => t.status === "pending").length,
    overdue: timesheets.filter((t) => t.status === "overdue").length,
  };
  // Fetch recent activity logs through actorMember relation
  const recentActivitiesRaw =
    await MyGlobal.prisma.hrm_tracker_activity_logs.findMany({
      where: {
        actorMember: {
          employees: {
            some: {
              organization_id: props.organizationId,
              deleted_at: null,
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
      select: {
        id: true,
        target_entity_type: true,
        target_entity_id: true,
        action_type: true,
        created_at: true,
        hrm_tracker_member_id: true,
        hrm_tracker_guest_id: true,
      },
    });
  const recentActivities: IHrmTrackerActivityLog.ISummary[] =
    recentActivitiesRaw.map((log) => ({
      id: log.id,
      target_entity_type: log.target_entity_type,
      target_entity_id: log.target_entity_id,
      action_type: log.action_type,
      created_at: toISOStringSafe(log.created_at),
      actorMember: null,
      actorGuest: null,
    }));
  return {
    employeeCount,
    projectStats,
    timesheetSummary,
    recentActivities,
  };
}
