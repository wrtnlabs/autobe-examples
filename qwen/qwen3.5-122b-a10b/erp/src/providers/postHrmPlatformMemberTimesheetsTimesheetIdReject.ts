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

export async function postHrmPlatformMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IReject;
}): Promise<IHrmPlatformTimesheet> {
  // 1. Validate timesheet exists and is not soft-deleted
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (timesheet === null || timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 2. Check status is 'submitted' - reject with 409 if not
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Timesheet is in '${timesheet.status}' status and cannot be rejected`,
      409,
    );
  }
  // 3. Verify member has time:approve permission in the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Member not found", 403);
  }
  // Check if member belongs to the same organization as the timesheet's employee
  const timesheetEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUnique({
      where: { id: timesheet.hrm_platform_employee_id },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (
    timesheetEmployee === null ||
    memberEmployee.hrm_platform_organization_id !==
      timesheetEmployee.hrm_platform_organization_id
  ) {
    throw new HttpException(
      "Timesheet does not belong to your organization",
      403,
    );
  }
  // Check if role has time:approve permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        hrm_platform_permission_id: "time:approve",
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Insufficient permissions", 403);
  }
  // 4. Validate rejection reason
  if (
    props.body.rejection_reason === null ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // 5. Update timesheet to rejected status
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      hrm_platform_member_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: props.body.rejection_reason,
      updated_at: new Date(),
    },
  });
  // 6. Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      action_type: "timesheet:rejected",
      target_entity: "timesheet",
      target_id: props.timesheetId,
      details: JSON.stringify({
        rejection_reason: props.body.rejection_reason,
        employee_id: timesheet.hrm_platform_employee_id,
      }),
      created_at: new Date(),
      organization: {
        connect: { id: memberEmployee.hrm_platform_organization_id },
      },
      user: {
        connect: { id: props.member.id },
      },
    },
  });
  // 7. Return updated timesheet
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
