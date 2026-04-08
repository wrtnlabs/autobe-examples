import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmTimeTrackMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the timelog with employee relation to verify ownership and get organization
  const timelog =
    await MyGlobal.prisma.hrm_time_track_timelogs.findUniqueOrThrow({
      where: {
        id: props.timelogId,
      },
      select: {
        id: true,
        hrm_time_track_employee_id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Step 2: Check if timelog is associated with any timesheet
  const timesheetAssociations =
    await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.findMany({
      where: {
        hrm_time_track_timelog_id: props.timelogId,
      },
      select: {
        hrm_time_track_timesheet_id: true,
      },
    });
  // Step 3: If associated with timesheets, check their statuses
  if (timesheetAssociations.length > 0) {
    const timesheetIds = timesheetAssociations.map(
      (a) => a.hrm_time_track_timesheet_id,
    );
    const timesheets = await MyGlobal.prisma.hrm_time_track_timesheets.findMany(
      {
        where: {
          id: {
            in: timesheetIds,
          },
        },
        select: {
          id: true,
          status: true,
        },
      },
    );
    // Block deletion if any associated timesheet is submitted or approved
    const blockedTimesheets = timesheets.filter(
      (t) => t.status === "submitted" || t.status === "approved",
    );
    if (blockedTimesheets.length > 0) {
      throw new HttpException(
        "Cannot delete timelog that is part of a submitted or approved timesheet",
        403,
      );
    }
  }
  // Step 4: Verify authorization
  // Fetch the employee record for the logged-in member in the timelog's organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: timelog.hrm_time_track_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check if user is the timelog owner
  const isOwner = employee.id === timelog.hrm_time_track_employee_id;
  // If not owner, check if user has time_management permission
  let hasTimeManagementPermission = false;
  if (!isOwner && employee.hrm_time_track_role_id) {
    const hasPermission =
      await MyGlobal.prisma.hrm_time_track_role_permissions.findFirst({
        where: {
          hrm_time_track_role_id: employee.hrm_time_track_role_id,
          permission: "time_management",
        },
      });
    hasTimeManagementPermission = hasPermission !== null;
  }
  // Authorize: must be owner OR have time_management permission
  if (!isOwner && !hasTimeManagementPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Delete the timelog (cascade will handle junction table entries)
  await MyGlobal.prisma.hrm_time_track_timelogs.delete({
    where: {
      id: props.timelogId,
    },
  });
  // Step 6: Record deletion in activity log
  await MyGlobal.prisma.hrm_time_track_activity_logs.create({
    data: {
      id: v4(),
      hrm_time_track_organization_id: timelog.hrm_time_track_organization_id,
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_employee_id: timelog.hrm_time_track_employee_id,
      activity_type: "timelog_deleted",
      description: `Timelog ${props.timelogId} was deleted`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
