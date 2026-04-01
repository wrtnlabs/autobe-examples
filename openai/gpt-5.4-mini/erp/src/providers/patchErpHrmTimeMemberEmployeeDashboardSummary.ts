import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
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

export async function patchErpHrmTimeMemberEmployeeDashboardSummary(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeDashboardSummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization: true,
        member: true,
        role: true,
        department: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_employee_dashboard_summaries.findUnique({
      where: {
        erp_hrm_time_employee_id: employee.id,
      },
      select: {
        id: true,
        hours_logged_today: true,
        hours_logged_this_week: true,
        has_active_timer: true,
        active_timer_started_at: true,
        recent_timelog_count: true,
        pending_timesheet_status: true,
        recent_timelog_snapshot_at: true,
        assigned_open_task_count: true,
        assigned_in_progress_task_count: true,
        snapshot_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (snapshot === null) {
    throw new HttpException("Dashboard summary not found", 404);
  }
  return {
    pagination: {
      current: props.body.page ?? 1,
      limit: props.body.limit ?? 100,
      records: 1,
      pages: 1,
    },
    data: [
      {
        id: snapshot.id,
        employee: {
          id: employee.id,
          organization: {
            id: employee.organization.id,
            name: employee.organization.name,
            ownerMemberId: employee.organization.owner_member_id,
            description: employee.organization.description,
            logoImageUrl: employee.organization.logo_image_url,
            status: employee.organization.status,
            createdAt: toISOStringSafe(employee.organization.created_at),
            updatedAt: toISOStringSafe(employee.organization.updated_at),
            deletedAt: employee.organization.deleted_at
              ? toISOStringSafe(employee.organization.deleted_at)
              : null,
          } satisfies IErpHrmTimeOrganization.ISummary,
          member: {
            id: employee.member.id,
            email: employee.member.email,
            displayName: employee.member.display_name,
            avatarImageUrl: employee.member.avatar_image_url,
            phoneNumber: employee.member.phone_number,
            createdAt: toISOStringSafe(employee.member.created_at),
            updatedAt: toISOStringSafe(employee.member.updated_at),
            deletedAt: employee.member.deleted_at
              ? toISOStringSafe(employee.member.deleted_at)
              : null,
          } satisfies IErpHrmTimeMember.ISummary,
          role: {
            id: employee.role.id,
            organization: {
              id: employee.role.erp_hrm_time_organization_id,
            } satisfies IEntity,
            name: employee.role.name,
            description: employee.role.description,
            isBuiltin: employee.role.is_builtin,
            createdAt: toISOStringSafe(employee.role.created_at),
            updatedAt: toISOStringSafe(employee.role.updated_at),
            deletedAt: employee.role.deleted_at
              ? toISOStringSafe(employee.role.deleted_at)
              : null,
          } satisfies IErpHrmTimeRole.ISummary,
          department:
            employee.department === null
              ? null
              : ({
                  id: employee.department.id,
                  organization: {
                    id: employee.department.erp_hrm_time_organization_id,
                  } satisfies IEntity,
                  parentDepartment: null,
                  name: employee.department.name,
                  description: employee.department.description,
                  createdAt: toISOStringSafe(employee.department.created_at),
                  updatedAt: toISOStringSafe(employee.department.updated_at),
                  deletedAt: employee.department.deleted_at
                    ? toISOStringSafe(employee.department.deleted_at)
                    : null,
                } satisfies IErpHrmTimeDepartment.ISummary),
          positionTitle: employee.position_title,
          employmentType: employee.employment_type,
          status: employee.status,
          createdAt: toISOStringSafe(employee.created_at),
          updatedAt: toISOStringSafe(employee.updated_at),
          deletedAt: employee.deleted_at
            ? toISOStringSafe(employee.deleted_at)
            : null,
        } satisfies IErpHrmTimeEmployee.ISummary,
        hoursLoggedToday: snapshot.hours_logged_today,
        hoursLoggedThisWeek: snapshot.hours_logged_this_week,
        hasActiveTimer: snapshot.has_active_timer,
        activeTimerStartedAt:
          snapshot.active_timer_started_at === null
            ? null
            : toISOStringSafe(snapshot.active_timer_started_at),
        recentTimelogCount: snapshot.recent_timelog_count,
        pendingTimesheetStatus: snapshot.pending_timesheet_status,
        recentTimelogSnapshotAt: toISOStringSafe(
          snapshot.recent_timelog_snapshot_at,
        ),
        assignedOpenTaskCount: snapshot.assigned_open_task_count,
        assignedInProgressTaskCount: snapshot.assigned_in_progress_task_count,
        snapshotAt: toISOStringSafe(snapshot.snapshot_at),
        createdAt: toISOStringSafe(snapshot.created_at),
        updatedAt: toISOStringSafe(snapshot.updated_at),
        deletedAt: snapshot.deleted_at
          ? toISOStringSafe(snapshot.deleted_at)
          : null,
      } satisfies IErpHrmTimeEmployeeDashboardSummary,
    ],
  } satisfies IPageIErpHrmTimeEmployeeDashboardSummary;
}
