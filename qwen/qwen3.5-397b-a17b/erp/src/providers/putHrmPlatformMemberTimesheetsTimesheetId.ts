import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        employee_id: true,
        status: true,
        timelogs: {
          select: { id: true },
        },
      },
    });
  const currentStatus = timesheet.status;
  const newStatus = props.body.status ?? currentStatus;
  // Check if timesheet is approved - locked, no modifications allowed
  if (currentStatus === "approved") {
    throw new HttpException("Approved timesheets cannot be modified", 403);
  }
  // Get employee record to check ownership
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: timesheet.employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        role_id: true,
      },
    });
  const isOwner = employee.member_id === props.member.id;
  // Check permissions based on status
  if (currentStatus === "draft" || currentStatus === "rejected") {
    // Only owner can update draft or rejected timesheets
    if (!isOwner) {
      throw new HttpException(
        "Only the timesheet owner can update draft or rejected timesheets",
        403,
      );
    }
  } else if (currentStatus === "submitted") {
    // Only users with time:approve permission can update submitted timesheets
    const rolePermissions =
      await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
        where: {
          hrm_platform_role_id: employee.role_id,
        },
        select: {
          permission: {
            select: {
              code: true,
            },
          },
        },
      });
    const hasTimeApprove = rolePermissions.some(
      (rp) => rp.permission.code === "time:approve",
    );
    if (!hasTimeApprove) {
      throw new HttpException(
        "Only users with time:approve permission can update submitted timesheets",
        403,
      );
    }
  }
  // Validate status transitions
  if (newStatus !== currentStatus) {
    // draft → submitted: require at least one timelog
    if (currentStatus === "draft" && newStatus === "submitted") {
      if (timesheet.timelogs.length === 0) {
        throw new HttpException(
          "Cannot submit timesheet without any timelogs",
          400,
        );
      }
    }
    // submitted → rejected: require rejection_reason
    if (currentStatus === "submitted" && newStatus === "rejected") {
      if (!props.body.rejection_reason) {
        throw new HttpException(
          "Rejection reason is required when rejecting a timesheet",
          400,
        );
      }
    }
  }
  // Build update data
  const updateData: Prisma.hrm_platform_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Handle status-specific fields
    if (props.body.status === "submitted" && currentStatus === "draft") {
      updateData.submitted_at = new Date();
    }
    if (props.body.status === "approved" && currentStatus === "submitted") {
      updateData.reviewed_at = new Date();
      updateData.reviewer = { connect: { id: props.member.id } };
      updateData.rejection_reason = null;
    }
    if (props.body.status === "rejected" && currentStatus === "submitted") {
      updateData.reviewed_at = new Date();
      updateData.reviewer = { connect: { id: props.member.id } };
      if (props.body.rejection_reason !== undefined) {
        updateData.rejection_reason = props.body.rejection_reason;
      }
    }
    if (props.body.status === "draft" && currentStatus === "rejected") {
      updateData.rejection_reason = null;
      updateData.reviewed_at = null;
      updateData.reviewer = { disconnect: true };
    }
  }
  if (
    props.body.rejection_reason !== undefined &&
    props.body.status !== "rejected"
  ) {
    updateData.rejection_reason = props.body.rejection_reason;
  }
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
